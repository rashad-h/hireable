import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from hireable.database import get_db
from hireable.models.db import Lesson, Progress, Roadmap, SessionModel, Subtopic, Topic
from hireable.models.schemas import (
    LessonSchema,
    RoadmapSchema,
    RoadmapSummary,
    SubtopicSchema,
    TopicSchema,
)
from hireable.routers.progress import calculate_level, get_session_xp

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


def _completed_lesson_ids(db: Session, session_id: str) -> set[str]:
    records = db.query(Progress).filter(Progress.session_id == session_id).all()
    return {r.lesson_id for r in records}


def _build_roadmap_schema(db: Session, roadmap: Roadmap, session_id: str | None = None) -> RoadmapSchema:
    completed = _completed_lesson_ids(db, session_id) if session_id else set()

    topics_out: list[TopicSchema] = []
    for topic in sorted(roadmap.topics, key=lambda t: t.order_index):
        subtopics_out: list[SubtopicSchema] = []
        topic_completed = 0
        topic_total = 0

        for subtopic in sorted(topic.subtopics, key=lambda s: s.order_index):
            lessons_out: list[LessonSchema] = []
            for lesson in sorted(subtopic.lessons, key=lambda l: l.order_index):
                topic_total += 1
                is_completed = lesson.id in completed
                if is_completed:
                    topic_completed += 1

                resources = json.loads(lesson.resources) if lesson.resources else None
                learn_content = json.loads(lesson.learn_content) if lesson.learn_content else None
                flashcards = json.loads(lesson.flashcards) if lesson.flashcards else None
                quiz = json.loads(lesson.quiz) if lesson.quiz else None

                is_locked = lesson.is_locked and lesson.prerequisite_lesson_id not in completed

                lessons_out.append(
                    LessonSchema(
                        id=lesson.id,
                        title=lesson.title,
                        description=lesson.description,
                        estimated_minutes=lesson.estimated_minutes,
                        xp_reward=lesson.xp_reward,
                        order_index=lesson.order_index,
                        is_locked=is_locked,
                        prerequisite_lesson_id=lesson.prerequisite_lesson_id,
                        completed=is_completed,
                        learn_content=learn_content,
                        resources=resources,
                        flashcards=flashcards,
                        quiz=quiz,
                    )
                )

            subtopics_out.append(
                SubtopicSchema(
                    id=subtopic.id,
                    title=subtopic.title,
                    order_index=subtopic.order_index,
                    lessons=lessons_out,
                )
            )

        topics_out.append(
            TopicSchema(
                id=topic.id,
                title=topic.title,
                description=topic.description,
                order_index=topic.order_index,
                icon=topic.icon,
                color=topic.color,
                xp_total=topic.xp_total,
                completed_lessons=topic_completed,
                total_lessons=topic_total,
                subtopics=subtopics_out,
            )
        )

    return RoadmapSchema(
        id=roadmap.id,
        title=roadmap.title,
        target_role=roadmap.target_role,
        gap_score=roadmap.gap_score,
        session_id=roadmap.session_id,
        topics=topics_out,
    )


@router.get("/{roadmap_id}", response_model=RoadmapSchema)
def get_roadmap(
    roadmap_id: str,
    session_id: str | None = None,
    db: Session = Depends(get_db),
) -> RoadmapSchema:
    roadmap = (
        db.query(Roadmap)
        .options(
            joinedload(Roadmap.topics)
            .joinedload(Topic.subtopics)
            .joinedload(Subtopic.lessons)
        )
        .filter(Roadmap.id == roadmap_id)
        .first()
    )
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found.")

    return _build_roadmap_schema(db, roadmap, session_id)


@router.get("/{roadmap_id}/summary", response_model=RoadmapSummary)
def get_roadmap_summary(
    roadmap_id: str,
    session_id: str,
    db: Session = Depends(get_db),
) -> RoadmapSummary:
    roadmap = (
        db.query(Roadmap)
        .options(
            joinedload(Roadmap.topics)
            .joinedload(Topic.subtopics)
            .joinedload(Subtopic.lessons)
        )
        .filter(Roadmap.id == roadmap_id)
        .first()
    )
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found.")

    completed_ids = _completed_lesson_ids(db, session_id)
    total_lessons = 0
    for topic in roadmap.topics:
        for subtopic in topic.subtopics:
            total_lessons += len(subtopic.lessons)

    xp = get_session_xp(db, session_id)

    return RoadmapSummary(
        title=roadmap.title,
        target_role=roadmap.target_role,
        gap_score=roadmap.gap_score,
        total_lessons=total_lessons,
        completed_lessons=len(completed_ids),
        xp_earned=xp,
        level=calculate_level(xp),
    )
