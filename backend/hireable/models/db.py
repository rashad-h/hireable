import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from hireable.database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


class SessionModel(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    cv_filename: Mapped[str] = mapped_column(String(255))
    target_role: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="parsing")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str] = mapped_column(String(500), default="Starting analysis...")
    roadmap_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("roadmaps.id"), nullable=True)
    cv_data_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_requirements_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    gap_analysis_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    claimed_skills_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    roadmap: Mapped["Roadmap | None"] = relationship("Roadmap", back_populates="session", foreign_keys=[roadmap_id])
    progress_records: Mapped[list["Progress"]] = relationship("Progress", back_populates="session")


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"))
    title: Mapped[str] = mapped_column(String(255))
    target_role: Mapped[str] = mapped_column(String(255))
    gap_score: Mapped[int] = mapped_column(Integer, default=0)
    cv_data: Mapped[str] = mapped_column(Text)
    job_requirements: Mapped[str] = mapped_column(Text)
    gap_analysis: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["SessionModel"] = relationship("SessionModel", foreign_keys=[session_id])
    topics: Mapped[list["Topic"]] = relationship("Topic", back_populates="roadmap", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    roadmap_id: Mapped[str] = mapped_column(String(36), ForeignKey("roadmaps.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    icon: Mapped[str] = mapped_column(String(10), default="📚")
    color: Mapped[str] = mapped_column(String(20), default="#6C63FF")
    xp_total: Mapped[int] = mapped_column(Integer, default=0)

    roadmap: Mapped["Roadmap"] = relationship("Roadmap", back_populates="topics")
    subtopics: Mapped[list["Subtopic"]] = relationship("Subtopic", back_populates="topic", cascade="all, delete-orphan")


class Subtopic(Base):
    __tablename__ = "subtopics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    topic_id: Mapped[str] = mapped_column(String(36), ForeignKey("topics.id"))
    title: Mapped[str] = mapped_column(String(255))
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    topic: Mapped["Topic"] = relationship("Topic", back_populates="subtopics")
    lessons: Mapped[list["Lesson"]] = relationship("Lesson", back_populates="subtopic", cascade="all, delete-orphan")


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    subtopic_id: Mapped[str] = mapped_column(String(36), ForeignKey("subtopics.id"))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    estimated_minutes: Mapped[int] = mapped_column(Integer, default=15)
    xp_reward: Mapped[int] = mapped_column(Integer, default=25)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    prerequisite_lesson_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("lessons.id"), nullable=True)
    resources: Mapped[str | None] = mapped_column(Text, nullable=True)
    learn_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    flashcards: Mapped[str | None] = mapped_column(Text, nullable=True)
    quiz: Mapped[str | None] = mapped_column(Text, nullable=True)

    subtopic: Mapped["Subtopic"] = relationship("Subtopic", back_populates="lessons")
    progress_records: Mapped[list["Progress"]] = relationship("Progress", back_populates="lesson")


class Progress(Base):
    __tablename__ = "progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("sessions.id"))
    lesson_id: Mapped[str] = mapped_column(String(36), ForeignKey("lessons.id"))
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    quiz_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped["SessionModel"] = relationship("SessionModel", back_populates="progress_records")
    lesson: Mapped["Lesson"] = relationship("Lesson", back_populates="progress_records")
