from pydantic import BaseModel, Field


class Job(BaseModel):
    title: str
    company: str
    status: str = Field(..., description="e.g. saved, applied, interviewing, offer")
    match_score: float = Field(ge=0, le=100, description="0-100 fit score")
