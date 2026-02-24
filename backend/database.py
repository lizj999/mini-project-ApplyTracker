"""
SQLAlchemy engine and session setup for SQLite persistence.
"""
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parent
SQLALCHEMY_DATABASE_URL = f"sqlite:///{BACKEND_DIR / 'applytracker.db'}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call after importing db_models so they register with Base."""
    Base.metadata.create_all(bind=engine)
    # Add new columns to jobs if they don't exist (migration for applied_at / follow_up_at)
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(jobs)"))
        cols = [row[1] for row in result]
        if cols and "applied_at" not in cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN applied_at DATETIME"))
        if cols and "follow_up_at" not in cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN follow_up_at DATETIME"))
        conn.commit()
