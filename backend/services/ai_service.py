"""
Together AI job parsing: extract structured fields from raw job post text.
API key loaded from .env (project root) per project rules.
"""

import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from together import Together

# Load .env from project root (same as main.py when running from backend/)
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo"

SYSTEM_PROMPT = """You are a job parsing assistant. Extract structured data from job postings.
Respond with a single valid JSON object only, no markdown or extra text.
Use this exact shape:
{"title": "...", "company": "...", "skills": ["skill1", "skill2"], "salary_range": "..." or "Not specified", "is_remote": true or false, "pain_points": ["challenge1", "challenge2", "challenge3"], "tech_stack": ["Python", "Java", ...]}
- pain_points: list of up to 3 short phrases for the role's top pain points or core challenges. Use empty list if none clearly stated.
- tech_stack: list of technologies, languages, frameworks, or tools mentioned (e.g. Python, Java, C, React, SQL, AWS). Up to 12 items. Use empty list if none clearly stated."""

USER_PROMPT_TEMPLATE = """Parse this job post and return the JSON object with: title, company, skills (list of strings), salary_range (string or "Not specified"), is_remote (boolean), pain_points (list of up to 3 short phrases for top pain points or core challenges), and tech_stack (list of technologies/tools mentioned, e.g. Python, Java, C, React, SQL—up to 12 items).

Job post:
---
{raw_text}
---"""


def _get_api_key() -> str | None:
    key = os.getenv("TOGETHER_API_KEY") or ""
    if not key or key.strip() == "your_key_here":
        return None
    return key.strip()


def _extract_json(text: str) -> dict:
    """Take model output and return parsed JSON dict; strip markdown code blocks if present."""
    text = text.strip()
    # Remove optional markdown code block
    if "```json" in text:
        text = re.sub(r"^```json\s*", "", text)
    if "```" in text:
        text = re.sub(r"\s*```\s*$", "", text)
    return json.loads(text)


def parse_job_description(raw_text: str) -> dict:
    """
    Use Together AI (Llama-3.3-70B-Instruct-Turbo) to parse a messy job post
    into a structured JSON object.

    Returns dict with: title, company, skills (list), salary_range, is_remote (bool).
    Raises ValueError if TOGETHER_API_KEY is not set or invalid.
    """
    api_key = _get_api_key()
    if not api_key:
        raise ValueError(
            "TOGETHER_API_KEY not configured. Add your key to the .env file."
        )

    client = Together(api_key=api_key)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT_TEMPLATE.format(raw_text=raw_text)},
        ],
        max_tokens=1024,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Together AI returned empty response")

    data = _extract_json(content)

    # Normalize to required shape
    pain_raw = data.get("pain_points")
    if not isinstance(pain_raw, list):
        pain_raw = []
    pain_points = [str(p).strip() for p in pain_raw[:3] if p and str(p).strip()]

    tech_raw = data.get("tech_stack")
    if not isinstance(tech_raw, list):
        tech_raw = []
    tech_stack = [str(t).strip() for t in tech_raw[:12] if t and str(t).strip()]

    return {
        "title": str(data.get("title", "")).strip() or "Unknown",
        "company": str(data.get("company", "")).strip() or "Unknown",
        "skills": (
            [str(s).strip() for s in data.get("skills", [])]
            if isinstance(data.get("skills"), list)
            else []
        ),
        "salary_range": str(data.get("salary_range", "Not specified")).strip()
        or "Not specified",
        "is_remote": bool(data.get("is_remote", False)),
        "pain_points": pain_points,
        "tech_stack": tech_stack,
    }


# --- Compatibility Scorer (resume vs job) ---

SCORE_MATCH_SYSTEM = """You are a resume–job compatibility analyst. Compare the candidate's resume (skills and experience) to the job requirements and respond with a single valid JSON object only, no markdown or extra text.
Use this exact shape:
{"match_score": <0-100 integer>, "missing_skills": ["skill1", "skill2"], "improvement_tip": "One concise sentence of actionable advice."}
- match_score: 0-100 overall fit based on skills and experience overlap.
- missing_skills: list of job-relevant skills or requirements the resume lacks (empty list if none).
- improvement_tip: exactly one short sentence the candidate can use to improve their fit."""

SCORE_MATCH_USER_TEMPLATE = """Compare this resume to this job and return the JSON object (match_score 0-100, missing_skills list, improvement_tip one sentence).

Job data:
{job_json}

Resume data:
{resume_json}"""


def score_resume_match(job_data: dict, resume_data: dict) -> dict:
    """
    Use Together AI (Llama-3.3-70B-Instruct-Turbo) to compare resume skills and
    experience against parsed job data. Returns compatibility score and feedback.

    Returns dict with: match_score (0-100), missing_skills (list), improvement_tip (str).
    Raises ValueError if TOGETHER_API_KEY is not set or invalid.
    """
    api_key = _get_api_key()
    if not api_key:
        raise ValueError(
            "TOGETHER_API_KEY not configured. Add your key to the .env file."
        )

    job_json = json.dumps(job_data, indent=2)
    resume_json = json.dumps(resume_data, indent=2)

    client = Together(api_key=api_key)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SCORE_MATCH_SYSTEM},
            {
                "role": "user",
                "content": SCORE_MATCH_USER_TEMPLATE.format(
                    job_json=job_json, resume_json=resume_json
                ),
            },
        ],
        max_tokens=512,
    )

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Together AI returned empty response")

    data = _extract_json(content)

    # Normalize and validate
    try:
        score = int(data.get("match_score", 0))
        score = max(0, min(100, score))
    except (TypeError, ValueError):
        score = 0

    missing = data.get("missing_skills")
    if not isinstance(missing, list):
        missing = []
    missing_skills = [str(s).strip() for s in missing if s]

    improvement_tip = str(data.get("improvement_tip", "")).strip()
    if not improvement_tip:
        improvement_tip = "Highlight relevant experience and skills in your application."

    return {
        "match_score": score,
        "missing_skills": missing_skills,
        "improvement_tip": improvement_tip,
    }


# --- Resume text to structured (for PDF uploads) ---

PARSE_RESUME_SYSTEM = """You are a resume parser. Extract structured data from resume text.
Respond with a single valid JSON object only, no markdown or extra text.
Use this shape: {"name": "...", "target_roles": ["role1"], "skills": ["skill1"], "experience": [{"company": "...", "role": "...", "highlights": "..."}]}"""


def parse_resume_to_structured(raw_text: str) -> dict:
    """Convert raw resume text (e.g. from PDF) to structured resume_data. Raises ValueError on failure."""
    api_key = _get_api_key()
    if not api_key:
        raise ValueError(
            "TOGETHER_API_KEY not configured. Add your key to the .env file."
        )
    client = Together(api_key=api_key)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": PARSE_RESUME_SYSTEM},
            {"role": "user", "content": f"Parse this resume into the JSON structure:\n\n{raw_text}"},
        ],
        max_tokens=1024,
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Together AI returned empty response")
    data = _extract_json(content)
    return {
        "name": str(data.get("name", "")).strip() or "Unknown",
        "target_roles": (
            [str(r).strip() for r in data.get("target_roles", [])]
            if isinstance(data.get("target_roles"), list)
            else []
        ),
        "skills": (
            [str(s).strip() for s in data.get("skills", [])]
            if isinstance(data.get("skills"), list)
            else []
        ),
        "experience": (
            data.get("experience", [])
            if isinstance(data.get("experience"), list)
            else []
        ),
    }


# --- Outreach (LinkedIn cold message) ---

OUTREACH_SYSTEM = """You are a professional networking assistant. Write a 3-paragraph LinkedIn cold message.
Synthesize the job requirements with the candidate's experience and highlights. Be concise, professional, and personalized.
Output only the message text, no subject line or labels."""

OUTREACH_USER_TEMPLATE = """Draft a 3-paragraph LinkedIn cold message for this candidate to reach out about this job.

Job:
{job_json}

Resume:
{resume_json}"""


def generate_outreach(job_data: dict, resume_data: dict) -> str:
    """
    Use Together AI (Llama-3.3-70B-Instruct-Turbo) to draft a 3-paragraph
    LinkedIn cold message from job + resume. Returns the message text.
    """
    api_key = _get_api_key()
    if not api_key:
        raise ValueError(
            "TOGETHER_API_KEY not configured. Add your key to the .env file."
        )
    client = Together(api_key=api_key)
    job_json = json.dumps(job_data, indent=2)
    resume_json = json.dumps(resume_data, indent=2)
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": OUTREACH_SYSTEM},
            {
                "role": "user",
                "content": OUTREACH_USER_TEMPLATE.format(
                    job_json=job_json, resume_json=resume_json
                ),
            },
        ],
        max_tokens=1024,
    )
    content = response.choices[0].message.content
    if not content:
        raise ValueError("Together AI returned empty response")
    return content.strip()
