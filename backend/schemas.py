from pydantic import BaseModel, Field


class JobSchema(BaseModel):
    title: str
    company: str
    status: str = Field(..., description="e.g. saved, applied, interviewing, offer")
    match_score: float = Field(ge=0, le=100, description="0-100 fit score")


class AnalyzeJobRequest(BaseModel):
    job_text: str


class ParseJobRequest(BaseModel):
    raw_text: str


class ScoreMatchRequest(BaseModel):
    job_data: dict
    resume_data: dict | None = None


class JobSaveBody(BaseModel):
    id: str | int | None = None  # optional; server assigns DB id if omitted

    class Config:
        extra = "allow"


class JobStatusUpdate(BaseModel):
    status: str
    applied_at: str | None = None  # optional date "YYYY-MM-DD" or ISO datetime; when set, follow_up_at = applied_at + 5 days
