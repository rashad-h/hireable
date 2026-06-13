import re
from copy import deepcopy

from hireable.models.db import Lesson, Roadmap, Subtopic, Topic
from hireable.models.schemas import SkillTreeBranch


def _skill_matches_text(skill: str, text: str) -> bool:
    skill_lower = skill.lower().strip()
    text_lower = text.lower()
    if not skill_lower or not text_lower:
        return False
    if skill_lower in text_lower:
        return True

    words = [w for w in re.split(r"\W+", skill_lower) if len(w) > 1]
    if len(words) >= 2:
        acronym = "".join(w[0] for w in words)
        if len(acronym) >= 2 and re.search(rf"\b{re.escape(acronym)}\b", text_lower):
            return True

    for word in words:
        if len(word) >= 4 and re.search(rf"\b{re.escape(word)}\b", text_lower):
            return True
    return False


def _lesson_context(lesson: Lesson, subtopic: Subtopic, topic: Topic) -> str:
    return " ".join(
        [
            topic.title,
            topic.description or "",
            subtopic.title,
            lesson.title,
            lesson.description or "",
        ]
    )


def _related_lesson_ids(skill: str, roadmap: Roadmap) -> list[str]:
    ids: list[str] = []
    for topic in roadmap.topics:
        for subtopic in topic.subtopics:
            for lesson in subtopic.lessons:
                if _skill_matches_text(skill, _lesson_context(lesson, subtopic, topic)):
                    ids.append(lesson.id)
    return ids


def _apply_progress_to_node(
    node: SkillTreeBranch,
    roadmap: Roadmap,
    completed_lesson_ids: set[str],
) -> None:
    if node.status and not node.children:
        related = _related_lesson_ids(node.name, roadmap)
        if related:
            done = sum(1 for lesson_id in related if lesson_id in completed_lesson_ids)
            if done == len(related):
                node.status = "known"
            elif done > 0 and node.status in ("missing", "unverified", "partial"):
                node.status = "partial"
        return

    for child in node.children:
        _apply_progress_to_node(child, roadmap, completed_lesson_ids)


def apply_lesson_progress_to_tree(
    tree: SkillTreeBranch | None,
    roadmap: Roadmap,
    completed_lesson_ids: set[str],
) -> SkillTreeBranch | None:
    if not tree:
        return None
    updated = deepcopy(tree)
    _apply_progress_to_node(updated, roadmap, completed_lesson_ids)
    return updated
