"""
SQLAlchemy ORM models for Jobs and Resume persistence.
"""
from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(512))
    company = Column(String(512))
    status = Column(String(64))
    match_score = Column(Float)
    raw_text = Column(Text)
    details = Column(Text)  # JSON string: skills, salary_range, is_remote, missing_skills, improvement_tip, etc.
    applied_at = Column(DateTime, nullable=True)   # set when status moves to Applied
    follow_up_at = Column(DateTime, nullable=True) # applied_at + 5 days


class Resume(Base):
    __tablename__ = "resume"

    id = Column(Integer, primary_key=True, autoincrement=True)
    raw_text = Column(Text)
    parsed_json = Column(Text)  # JSON string (resume_data)
