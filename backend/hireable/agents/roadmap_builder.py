import json

from sqlalchemy.orm import Session

from hireable.models.db import Lesson, Roadmap, Subtopic, Topic
from hireable.models.schemas import GapAnalysis, JobRequirements, RoadmapTreeInput
from hireable.services.openrouter import chat_completion_json


async def build_roadmap(
    db: Session,
    session_id: str,
    target_role: str,
    gap_analysis: GapAnalysis,
    cv_data_json: str,
    job_requirements_json: str,
) -> Roadmap:
    messages = [
        {
            "role": "system",
            "content": (
                "You create gamified learning roadmaps to close skill gaps. Return valid JSON only with structure:\n"
                "{\n"
                '  "title": "Role Roadmap",\n'
                '  "topics": [\n'
                "    {\n"
                '      "title": "Topic Name", "description": "...", "order_index": 0,\n'
                '      "icon": "🧠", "color": "#6C63FF",\n'
                '      "subtopics": [\n'
                "        {\n"
                '          "title": "Subtopic", "order_index": 0,\n'
                '          "lessons": [\n'
                "            {\n"
                '              "title": "Lesson", "description": "...", "estimated_minutes": 15,\n'
                '              "xp_reward": 25, "order_index": 0, "prerequisite_index": null\n'
                "            }\n"
                "          ]\n"
                "        }\n"
                "      ]\n"
                "    }\n"
                "  ]\n"
                "}\n"
                "Create 3-5 topics, each with 3-5 subtopics, each with 2-3 lessons. "
                "Focus on skills_missing and skills_partial. xp_reward: 10 easy, 25 intermediate, 50 advanced. "
                "prerequisite_index refers to lesson order_index within same subtopic (null for first lesson)."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Target role: {target_role}\n"
                f"Gap analysis: {gap_analysis.model_dump_json()}\n"
                "Build a complete learning roadmap."
            ),
        },
    ]
    data, _ = await chat_completion_json(messages)
    tree = RoadmapTreeInput.model_validate(data)

    roadmap = Roadmap(
        session_id=session_id,
        title=tree.title,
        target_role=target_role,
        gap_score=gap_analysis.gap_score,
        cv_data=cv_data_json,
        job_requirements=job_requirements_json,
        gap_analysis=gap_analysis.model_dump_json(),
    )
    db.add(roadmap)
    db.flush()

    lesson_id_map: dict[tuple[int, int, int], str] = {}

    for topic_input in tree.topics:
        topic = Topic(
            roadmap_id=roadmap.id,
            title=topic_input.title,
            description=topic_input.description,
            order_index=topic_input.order_index,
            icon=topic_input.icon,
            color=topic_input.color,
        )
        db.add(topic)
        db.flush()

        topic_xp = 0
        for subtopic_input in topic_input.subtopics:
            subtopic = Subtopic(
                topic_id=topic.id,
                title=subtopic_input.title,
                order_index=subtopic_input.order_index,
            )
            db.add(subtopic)
            db.flush()

            for lesson_input in subtopic_input.lessons:
                lesson = Lesson(
                    subtopic_id=subtopic.id,
                    title=lesson_input.title,
                    description=lesson_input.description,
                    estimated_minutes=lesson_input.estimated_minutes,
                    xp_reward=lesson_input.xp_reward,
                    order_index=lesson_input.order_index,
                    is_locked=False,
                )
                db.add(lesson)
                db.flush()
                key = (topic_input.order_index, subtopic_input.order_index, lesson_input.order_index)
                lesson_id_map[key] = lesson.id
                topic_xp += lesson_input.xp_reward

            for lesson_input in subtopic_input.lessons:
                if lesson_input.prerequisite_index is not None:
                    key = (topic_input.order_index, subtopic_input.order_index, lesson_input.order_index)
                    prereq_key = (
                        topic_input.order_index,
                        subtopic_input.order_index,
                        lesson_input.prerequisite_index,
                    )
                    lesson_id = lesson_id_map.get(key)
                    prereq_id = lesson_id_map.get(prereq_key)
                    if lesson_id and prereq_id:
                        lesson = db.get(Lesson, lesson_id)
                        if lesson:
                            lesson.prerequisite_lesson_id = prereq_id
                            lesson.is_locked = True

        topic.xp_total = topic_xp

    db.commit()
    db.refresh(roadmap)
    return roadmap
