import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from hireable.agents.content_generator import generate_lesson_content
from hireable.database import get_db
from hireable.models.db import Lesson, Progress
from hireable.models.schemas import (
    CompleteLessonRequest,
    CompleteLessonResponse,
    FlashcardItem,
    GenerateContentRequest,
    GenerateContentResponse,
    LearnContent,
    LessonSchema,
    QuizItem,
    ResourceItem,
)
from hireable.routers.progress import calculate_level, get_session_xp

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


def _parse_json_field(raw: str | None) -> list | None:
    if not raw:
        return None
    return json.loads(raw)


def _parse_learn_content(raw: str | None) -> LearnContent | None:
    if not raw:
        return None
    return LearnContent.model_validate(json.loads(raw))


def _lesson_to_schema(lesson: Lesson, completed: bool = False, is_locked: bool = False) -> LessonSchema:
    return LessonSchema(
        id=lesson.id,
        title=lesson.title,
        description=lesson.description,
        estimated_minutes=lesson.estimated_minutes,
        xp_reward=lesson.xp_reward,
        order_index=lesson.order_index,
        is_locked=is_locked,
        prerequisite_lesson_id=lesson.prerequisite_lesson_id,
        completed=completed,
        learn_content=_parse_learn_content(lesson.learn_content),
        resources=_parse_json_field(lesson.resources),
        flashcards=_parse_json_field(lesson.flashcards),
        quiz=_parse_json_field(lesson.quiz),
    )


@router.get("/{lesson_id}", response_model=LessonSchema)
async def get_lesson(
    lesson_id: str,
    session_id: str | None = None,
    db: Session = Depends(get_db),
) -> LessonSchema:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    completed = False
    is_locked = lesson.is_locked
    if session_id:
        existing = (
            db.query(Progress)
            .filter(Progress.session_id == session_id, Progress.lesson_id == lesson_id)
            .first()
        )
        completed = existing is not None
        if lesson.prerequisite_lesson_id:
            prereq_done = (
                db.query(Progress)
                .filter(
                    Progress.session_id == session_id,
                    Progress.lesson_id == lesson.prerequisite_lesson_id,
                )
                .first()
            )
            is_locked = lesson.is_locked and prereq_done is None

    return _lesson_to_schema(lesson, completed=completed, is_locked=is_locked)


@router.post("/{lesson_id}/generate-content", response_model=GenerateContentResponse)
async def generate_content(
    lesson_id: str,
    body: GenerateContentRequest,
    db: Session = Depends(get_db),
) -> GenerateContentResponse:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    field_map = {
        "learn": lesson.learn_content,
        "resources": lesson.learn_content,
        "flashcards": lesson.flashcards,
        "quiz": lesson.quiz,
    }
    if field_map.get(body.content_type):
        db.refresh(lesson)
    else:
        await generate_lesson_content(db, lesson, body.content_type)
        db.refresh(lesson)

    learn_content = _parse_learn_content(lesson.learn_content)
    resources = [ResourceItem.model_validate(r) for r in (_parse_json_field(lesson.resources) or [])]
    flashcards = [FlashcardItem.model_validate(f) for f in (_parse_json_field(lesson.flashcards) or [])]
    quiz = [QuizItem.model_validate(q) for q in (_parse_json_field(lesson.quiz) or [])]

    return GenerateContentResponse(
        learn_content=learn_content,
        resources=resources or None,
        flashcards=flashcards or None,
        quiz=quiz or None,
    )


@router.post("/{lesson_id}/complete", response_model=CompleteLessonResponse)
def complete_lesson(
    lesson_id: str,
    body: CompleteLessonRequest,
    session_id: str,
    db: Session = Depends(get_db),
) -> CompleteLessonResponse:
    lesson = db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    existing = (
        db.query(Progress)
        .filter(Progress.session_id == session_id, Progress.lesson_id == lesson_id)
        .first()
    )
    if existing:
        total_xp = get_session_xp(db, session_id)
        return CompleteLessonResponse(
            xp_earned=0,
            total_xp=total_xp,
            level_up=False,
            new_level=calculate_level(total_xp),
        )

    if lesson.prerequisite_lesson_id:
        prereq_done = (
            db.query(Progress)
            .filter(
                Progress.session_id == session_id,
                Progress.lesson_id == lesson.prerequisite_lesson_id,
            )
            .first()
        )
        if not prereq_done:
            raise HTTPException(status_code=400, detail="Complete the prerequisite lesson first.")

    old_xp = get_session_xp(db, session_id)
    old_level = calculate_level(old_xp)

    xp_earned = lesson.xp_reward
    if body.quiz_score is not None and body.quiz_score >= 80:
        xp_earned = int(xp_earned * 1.2)

    progress = Progress(
        session_id=session_id,
        lesson_id=lesson_id,
        quiz_score=body.quiz_score,
        xp_earned=xp_earned,
    )
    db.add(progress)
    db.commit()

    total_xp = get_session_xp(db, session_id)
    new_level = calculate_level(total_xp)

    return CompleteLessonResponse(
        xp_earned=xp_earned,
        total_xp=total_xp,
        new_level=new_level,
        level_up=new_level > old_level,
    )
