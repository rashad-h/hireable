from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ExperienceItem(BaseModel):
    title: str = ""
    company: str = ""
    duration: str = ""
    description: str = ""


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    year: str = ""


class CVData(BaseModel):
    name: str = ""
    email: str = ""
    skills: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)


class JobRequirements(BaseModel):
    required_skills: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    experience_years: int = 0


class TargetJobListing(BaseModel):
    title: str
    company: str
    location: str = ""
    url: str
    salary_range: str = ""
    why_ready: str = ""
    key_requirements: list[str] = Field(default_factory=list)
    training_focus: list[str] = Field(default_factory=list)


class SkillAssessment(BaseModel):
    skill: str
    detail: str


class HiddenSkillPrompt(BaseModel):
    skill: str
    reason: str
    in_job_descriptions: bool = True


class SkillClaimPrompt(BaseModel):
    skill: str
    prompt: str
    related_to: str = ""


class SkillTreeBranch(BaseModel):
    name: str
    icon: str = ""
    status: Literal["known", "partial", "missing", "unverified"] | None = None
    children: list["SkillTreeBranch"] = Field(default_factory=list)


SkillTreeBranch.model_rebuild()


class GapAnalysis(BaseModel):
    skills_present: list[str] = Field(default_factory=list)
    skills_missing: list[str] = Field(default_factory=list)
    skills_partial: list[str] = Field(default_factory=list)
    gap_score: int = 0
    role_fun_fact: str = ""
    ideal_candidate_summary: str = ""
    ideal_skills: list[str] = Field(default_factory=list)
    strengths: list[SkillAssessment] = Field(default_factory=list)
    weaknesses: list[SkillAssessment] = Field(default_factory=list)
    hirability_score: int = 0
    goal_assessment: str = ""
    hidden_weaknesses: list[HiddenSkillPrompt] = Field(default_factory=list)
    skills_to_claim: list[SkillClaimPrompt] = Field(default_factory=list)
    skill_tree: SkillTreeBranch | None = None
    target_jobs: list[TargetJobListing] = Field(default_factory=list)


class ResourceItem(BaseModel):
    type: Literal["youtube", "article"]
    title: str
    url: str


class LearnCheckItem(BaseModel):
    id: str
    label: str


class LearnStep(BaseModel):
    id: str
    title: str
    content: str
    check_items: list[LearnCheckItem] = Field(default_factory=list)
    resource: ResourceItem | None = None


class LearnContent(BaseModel):
    summary: str
    steps: list[LearnStep] = Field(default_factory=list)
    resources: list[ResourceItem] = Field(default_factory=list)


class FlashcardItem(BaseModel):
    front: str
    back: str


class QuizItem(BaseModel):
    question: str
    options: list[str]
    correct: str
    explanation: str


class LessonSchema(BaseModel):
    id: str
    title: str
    description: str
    estimated_minutes: int
    xp_reward: int
    order_index: int
    is_locked: bool
    prerequisite_lesson_id: str | None = None
    completed: bool = False
    learn_content: LearnContent | None = None
    resources: list[ResourceItem] | None = None
    flashcards: list[FlashcardItem] | None = None
    quiz: list[QuizItem] | None = None


class SubtopicSchema(BaseModel):
    id: str
    title: str
    order_index: int
    lessons: list[LessonSchema] = Field(default_factory=list)


class TopicSchema(BaseModel):
    id: str
    title: str
    description: str
    order_index: int
    icon: str
    color: str
    xp_total: int
    completed_lessons: int = 0
    total_lessons: int = 0
    subtopics: list[SubtopicSchema] = Field(default_factory=list)


class RoadmapSchema(BaseModel):
    id: str
    title: str
    target_role: str
    gap_score: int
    role_fun_fact: str = ""
    skill_tree: SkillTreeBranch | None = None
    session_id: str | None = None
    topics: list[TopicSchema] = Field(default_factory=list)


class UploadResponse(BaseModel):
    session_id: str
    status: str


class StatusResponse(BaseModel):
    status: str
    progress: int
    message: str
    roadmap_id: str | None = None
    skill_tree: SkillTreeBranch | None = None
    target_role: str | None = None


class AnalysisReportResponse(BaseModel):
    target_role: str
    candidate_name: str
    cv_data: CVData
    job_requirements: JobRequirements
    gap_analysis: GapAnalysis
    claimed_skills: list[str] = Field(default_factory=list)


class AcknowledgeAnalysisRequest(BaseModel):
    claimed_skills: list[str] = Field(default_factory=list)


class RoadmapSummary(BaseModel):
    title: str
    target_role: str
    gap_score: int
    total_lessons: int
    completed_lessons: int
    xp_earned: int
    level: int


class GenerateContentRequest(BaseModel):
    content_type: Literal["flashcards", "quiz", "resources", "learn"]


class GenerateContentResponse(BaseModel):
    learn_content: LearnContent | None = None
    flashcards: list[FlashcardItem] | None = None
    quiz: list[QuizItem] | None = None
    resources: list[ResourceItem] | None = None


class CompleteLessonRequest(BaseModel):
    quiz_score: int | None = None


class CompleteLessonResponse(BaseModel):
    xp_earned: int
    new_level: int | None = None
    total_xp: int
    level_up: bool


class ProgressResponse(BaseModel):
    xp: int
    level: int
    completed_lessons: list[str]
    streak: int
    completion_percentage: float


class RoadmapLessonInput(BaseModel):
    title: str
    description: str
    estimated_minutes: int = 15
    xp_reward: int = 25
    order_index: int = 0
    prerequisite_index: int | None = None


class RoadmapSubtopicInput(BaseModel):
    title: str
    order_index: int = 0
    lessons: list[RoadmapLessonInput] = Field(default_factory=list)


class RoadmapTopicInput(BaseModel):
    title: str
    description: str = ""
    order_index: int = 0
    icon: str = "📚"
    color: str = "#6C63FF"
    subtopics: list[RoadmapSubtopicInput] = Field(default_factory=list)


class RoadmapTreeInput(BaseModel):
    title: str
    topics: list[RoadmapTopicInput] = Field(default_factory=list)
