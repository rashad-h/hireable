import math

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from hireable.database import get_db
from hireable.models.db import Lesson, Progress, Roadmap, SessionModel, Subtopic, Topic
from hireable.models.schemas import ProgressResponse

router = APIRouter(prefix="/api/progress", tags=["progress"])


def calculate_level(xp: int) -> int:
    return math.floor(xp / 100) + 1


def get_session_xp(db: Session, session_id: str) -> int:
    records = db.query(Progress).filter(Progress.session_id == session_id).all()
    return sum(r.xp_earned for r in records)


@router.get("/{session_id}", response_model=ProgressResponse)
def get_progress(session_id: str, db: Session = Depends(get_db)) -> ProgressResponse:
    session = db.get(SessionModel, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    records = db.query(Progress).filter(Progress.session_id == session_id).all()
    xp = sum(r.xp_earned for r in records)
    completed_lessons = [r.lesson_id for r in records]

    total_lessons = 0
    if session.roadmap_id:
        roadmap = (
            db.query(Roadmap)
            .filter(Roadmap.id == session.roadmap_id)
            .first()
        )
        if roadmap:
            for topic in roadmap.topics:
                for subtopic in topic.subtopics:
                    total_lessons += len(subtopic.lessons)

    completion = (len(completed_lessons) / total_lessons * 100) if total_lessons else 0.0

    return ProgressResponse(
        xp=xp,
        level=calculate_level(xp),
        completed_lessons=completed_lessons,
        streak=1 if completed_lessons else 0,
        completion_percentage=round(completion, 1),
    )
