from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from hireable.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate() -> None:
    if not settings.database_url.startswith("sqlite"):
        return
    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(sessions)")).fetchall()
        existing = {row[1] for row in rows}
        for column, col_type in [
            ("cv_data_json", "TEXT"),
            ("job_requirements_json", "TEXT"),
            ("gap_analysis_json", "TEXT"),
            ("claimed_skills_json", "TEXT"),
        ]:
            if column not in existing:
                conn.execute(text(f"ALTER TABLE sessions ADD COLUMN {column} {col_type}"))

        lesson_rows = conn.execute(text("PRAGMA table_info(lessons)")).fetchall()
        lesson_cols = {row[1] for row in lesson_rows}
        if "learn_content" not in lesson_cols:
            conn.execute(text("ALTER TABLE lessons ADD COLUMN learn_content TEXT"))
        conn.commit()


def init_db() -> None:
    from hireable.models import db as _models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate()
