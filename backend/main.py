import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db
from db_models import Job as JobModel, Resume as ResumeModel
from schemas import (
    AnalyzeJobRequest,
    JobSaveBody,
    JobSchema,
    JobStatusUpdate,
    ParseJobRequest,
    ScoreMatchRequest,
)
from services.ai_service import (
    generate_outreach,
    parse_job_description,
    parse_resume_to_structured,
    score_resume_match,
)

import db_models  # noqa: F401  # register tables before init_db

# Load .env from project root when running from backend/
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

# Create tables on module load
init_db()

# Strip hidden control chars and normalize newlines
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _normalize_job_text(raw: str) -> str:
    if not raw:
        return raw
    no_control = _CONTROL_CHARS.sub("", raw)
    return re.sub(r"\r\n|\r", "\n", no_control)


def _get_resume_data(db: Session) -> dict | None:
    """Return structured resume_data for score-match/outreach; parse raw_text with AI if needed."""
    row = db.query(ResumeModel).first()
    if not row:
        return None
    if row.parsed_json:
        try:
            return json.loads(row.parsed_json)
        except json.JSONDecodeError:
            pass
    if row.raw_text:
        try:
            parsed = parse_resume_to_structured(row.raw_text)
            row.parsed_json = json.dumps(parsed)
            db.commit()
            return parsed
        except Exception:
            return None
    return None


def _job_row_to_dict(row: JobModel) -> dict:
    d = {
        "id": row.id,
        "title": row.title,
        "company": row.company,
        "status": row.status,
        "match_score": row.match_score,
        "raw_text": row.raw_text,
        "applied_at": row.applied_at.isoformat() if getattr(row, "applied_at", None) and row.applied_at else None,
        "follow_up_at": row.follow_up_at.isoformat() if getattr(row, "follow_up_at", None) and row.follow_up_at else None,
    }
    if row.details:
        try:
            d.update(json.loads(row.details))
        except json.JSONDecodeError:
            pass
    return d


app = FastAPI(title="ApplyTracker", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"app": "ApplyTracker", "docs": "/docs"}


@app.post("/api/upload-resume")
async def api_upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Accept a resume file (JSON or PDF). Stored in DB; survives restart."""
    filename = (file.filename or "").lower()
    if not filename:
        raise HTTPException(status_code=400, detail="Missing filename")
    contents = await file.read()
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        text = None

    row = db.query(ResumeModel).first()
    if not row:
        row = ResumeModel(raw_text=None, parsed_json=None)
        db.add(row)
        db.flush()

    if filename.endswith(".json"):
        if text is None:
            raise HTTPException(status_code=400, detail="JSON file must be UTF-8")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON: {e}") from e
        row.parsed_json = json.dumps(data)
        row.raw_text = None
        db.commit()
        return {"ok": True, "message": "Resume (JSON) saved."}

    if filename.endswith(".pdf"):
        try:
            from io import BytesIO
            from pypdf import PdfReader
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="PDF support requires: pip install pypdf",
            )
        try:
            reader = PdfReader(BytesIO(contents))
            parts = []
            for page in reader.pages:
                parts.append(page.extract_text() or "")
            raw_text = "\n".join(parts).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF read failed: {e}") from e
        if not raw_text:
            raw_text = "(No text extracted from PDF)"
        row.raw_text = raw_text
        row.parsed_json = None  # will be parsed on first use if needed
        db.commit()
        return {"ok": True, "message": "Resume (PDF) text extracted and saved."}

    raise HTTPException(
        status_code=400,
        detail="Unsupported file type. Use .json or .pdf",
    )


@app.get("/api/resume")
def api_get_resume(db: Session = Depends(get_db)):
    """Return current stored resume from DB."""
    row = db.query(ResumeModel).first()
    if not row:
        return {"resume_data": None, "raw_text": None}
    resume_data = None
    if row.parsed_json:
        try:
            resume_data = json.loads(row.parsed_json)
        except json.JSONDecodeError:
            pass
    return {
        "resume_data": resume_data,
        "raw_text": row.raw_text if not resume_data else None,
    }


@app.get("/api/jobs")
def api_list_jobs(db: Session = Depends(get_db)):
    """Return all jobs from DB so the Kanban board stays populated."""
    rows = db.query(JobModel).order_by(JobModel.id).all()
    return [_job_row_to_dict(r) for r in rows]


@app.get("/api/reminders")
def api_reminders(db: Session = Depends(get_db)):
    """Return jobs where follow_up_at is today or in the past (need attention)."""
    now = datetime.now(timezone.utc)
    rows = (
        db.query(JobModel)
        .filter(JobModel.follow_up_at.isnot(None), JobModel.follow_up_at <= now)
        .order_by(JobModel.follow_up_at)
        .all()
    )
    return [_job_row_to_dict(r) for r in rows]


@app.post("/api/jobs")
def api_save_job(body: JobSaveBody, db: Session = Depends(get_db)):
    """Save a job to the database. Returns the permanent DB id."""
    try:
        job = body.model_dump()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request body: {e}") from e
    job.pop("id", None)  # let DB assign id
    raw_text = job.pop("raw_text", None)
    details = {}
    for key in list(job.keys()):
        if key not in ("title", "company", "status", "match_score"):
            val = job.pop(key)
            if val is not None and not isinstance(val, (str, int, float, bool, list, dict)):
                continue
            details[key] = val
    try:
        ms = job.get("match_score", 0)
        match_score = float(ms) if ms is not None and ms != "" else 0.0
        match_score = max(0.0, min(100.0, match_score))
    except (TypeError, ValueError):
        match_score = 0.0
    try:
        details_str = json.dumps(details) if details else None
    except (TypeError, ValueError):
        details_str = None
    row = JobModel(
        title=str(job.get("title") or "")[:512],
        company=str(job.get("company") or "")[:512],
        status=str(job.get("status") or "Discovery")[:64],
        match_score=match_score,
        raw_text=raw_text,
        details=details_str,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id}


@app.delete("/api/jobs")
def api_delete_all_jobs(db: Session = Depends(get_db)):
    """Remove all jobs from the database (total reset)."""
    db.query(JobModel).delete()
    db.commit()
    return {"ok": True, "deleted": "all"}


@app.delete("/api/jobs/{job_id}")
def api_delete_job(job_id: str, db: Session = Depends(get_db)):
    """Remove a single job from the database."""
    try:
        pk = int(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job id")
    row = db.query(JobModel).filter(JobModel.id == pk).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(row)
    db.commit()
    return {"ok": True, "id": pk}


def _parse_applied_at(value: str) -> datetime | None:
    """Parse applied_at from 'YYYY-MM-DD' or ISO datetime; return UTC datetime or None."""
    if not value or not value.strip():
        return None
    value = value.strip()
    try:
        if "T" in value or " " in value:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            dt = datetime.strptime(value[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None


@app.patch("/api/jobs/{job_id}")
def api_update_job_status(job_id: str, body: JobStatusUpdate, db: Session = Depends(get_db)):
    """Update a job's status when moved in the Kanban board. When status becomes Applied, set applied_at and follow_up_at. If applied_at is sent, use it and set follow_up_at = applied_at + 5 days."""
    try:
        pk = int(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job id")
    row = db.query(JobModel).filter(JobModel.id == pk).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")

    if body.status == "Applied":
        if body.applied_at is not None:
            parsed = _parse_applied_at(body.applied_at)
            if parsed is not None:
                row.applied_at = parsed
                row.follow_up_at = parsed + timedelta(days=5)
        elif row.status != "Applied":
            now = datetime.now(timezone.utc)
            row.applied_at = now
            row.follow_up_at = now + timedelta(days=5)

    row.status = body.status
    db.commit()
    db.refresh(row)
    return {"ok": True, "id": row.id, "status": row.status, "applied_at": row.applied_at.isoformat() if row.applied_at else None, "follow_up_at": row.follow_up_at.isoformat() if row.follow_up_at else None}


@app.get("/api/outreach/{job_id}")
def api_outreach(job_id: str, db: Session = Depends(get_db)):
    """Generate a 3-paragraph LinkedIn cold message for this job using stored resume."""
    try:
        pk = int(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job id")
    row = db.query(JobModel).filter(JobModel.id == pk).first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    job = _job_row_to_dict(row)
    resume_data = _get_resume_data(db)
    if not resume_data:
        raise HTTPException(
            status_code=400,
            detail="No resume on file. Upload a resume first.",
        )
    try:
        message = generate_outreach(job, resume_data)
        return {"message": message}
    except ValueError as e:
        if "TOGETHER_API_KEY" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Outreach unavailable. Configure TOGETHER_API_KEY in .env.",
            ) from e
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.post("/api/parse")
def api_parse(body: ParseJobRequest):
    """Parse a raw job post into title, company, skills, salary_range, is_remote."""
    try:
        text = _normalize_job_text(body.raw_text)
        result = parse_job_description(text)
        return result
    except ValueError as e:
        if "TOGETHER_API_KEY" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Job parsing is unavailable. Configure TOGETHER_API_KEY in .env.",
            ) from e
        raise HTTPException(status_code=400, detail=str(e)) from e
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail="Job parsing returned invalid format. Try again.",
        ) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/api/score-match")
def api_score_match(body: ScoreMatchRequest, db: Session = Depends(get_db)):
    """Compare resume to job. Uses uploaded resume from DB if resume_data omitted."""
    try:
        resume_data = body.resume_data
        if resume_data is None:
            resume_data = _get_resume_data(db)
        if resume_data is None:
            raise HTTPException(
                status_code=400,
                detail="No resume data. Upload a resume (JSON or PDF) at /api/upload-resume first, or send resume_data in the request.",
            )
        result = score_resume_match(body.job_data, resume_data)
        return result
    except HTTPException:
        raise
    except ValueError as e:
        if "TOGETHER_API_KEY" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Scoring is unavailable. Configure TOGETHER_API_KEY in .env.",
            ) from e
        raise HTTPException(status_code=400, detail=str(e)) from e
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail="Scoring returned invalid format. Try again.",
        ) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/analyze-job")
def analyze_job(body: AnalyzeJobRequest):
    """Legacy placeholder."""
    api_key = os.getenv("TOGETHER_API_KEY") or ""
    if not api_key or api_key == "your_key_here":
        return {
            "message": "TOGETHER_API_KEY not configured. Add your key to .env to parse job text.",
            "job": None,
        }
    return {
        "message": "Analysis placeholder; use POST /api/parse and /api/score-match.",
        "job": JobSchema(
            title="(parsed from job text)",
            company="(parsed from job text)",
            status="saved",
            match_score=0.0,
        ),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
