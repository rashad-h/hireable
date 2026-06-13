import json
import re

from sqlalchemy.orm import Session

from hireable.models.db import Lesson
from hireable.models.schemas import (
    FlashcardItem,
    LearnCheckItem,
    LearnContent,
    LearnStep,
    QuizItem,
    ResourceItem,
)
from hireable.services.openrouter import chat_completion_json


def _extract_youtube_urls(text: str, citations: list[dict]) -> list[ResourceItem]:
    resources: list[ResourceItem] = []
    seen: set[str] = set()

    for citation in citations:
        url = citation.get("url", "")
        title = citation.get("title", "Resource")
        if not url or url in seen:
            continue
        seen.add(url)
        if "youtube.com" in url or "youtu.be" in url:
            resources.append(ResourceItem(type="youtube", title=title, url=url))
        else:
            resources.append(ResourceItem(type="article", title=title, url=url))

    for match in re.findall(r"https?://(?:www\.)?(?:youtube\.com/watch\?v=[\w-]+|youtu\.be/[\w-]+)", text):
        if match not in seen:
            seen.add(match)
            resources.append(ResourceItem(type="youtube", title="YouTube Tutorial", url=match))

    return resources


def _attach_resources_to_steps(content: LearnContent) -> LearnContent:
    new_steps: list[LearnStep] = []
    for i, step in enumerate(content.steps):
        resource = step.resource
        if resource is None and content.resources:
            resource = content.resources[i % len(content.resources)]
        new_steps.append(step.model_copy(update={"resource": resource}))
    return content.model_copy(update={"steps": new_steps})


async def generate_learn_content(lesson: Lesson) -> LearnContent:
    messages = [
        {
            "role": "system",
            "content": (
                "You create interactive beginner lessons. Search the web for real tutorials. "
                "Return valid JSON only:\n"
                "{\n"
                '  "summary": "Markdown overview — use ## headings, **bold**, bullet lists. 2-3 short paragraphs.",\n'
                '  "steps": [\n'
                "    {\n"
                '      "id": "step-1",\n'
                '      "title": "Clear step title",\n'
                '      "content": "Markdown lesson chunk for this step — concise, practical, use **bold** and - bullets",\n'
                '      "check_items": [\n'
                '        {"id": "c1", "label": "I understand ..."},\n'
                '        {"id": "c2", "label": "I can explain ..."}\n'
                "      ],\n"
                '      "resource_index": 0\n'
                "    }\n"
                "  ],\n"
                '  "resources": [{"type": "youtube"|"article", "title": "...", "url": "https://..."}]\n'
                "}\n"
                "Rules: 4-6 steps building on each other. 2-4 check_items per step (things the learner should confirm). "
                "Include 3-5 real resource URLs. resource_index links a step to a resource (0-based). "
                "Summary covers key takeaways. Be specific to the lesson topic."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Create an interactive lesson for: {lesson.title}\n"
                f"Description: {lesson.description}\n"
                f"Search for '{lesson.title} tutorial beginner' and '{lesson.title} explained'."
            ),
        },
    ]
    data, citations = await chat_completion_json(messages, web_search=True, max_results=8)

    resources = [ResourceItem.model_validate(r) for r in data.get("resources", [])]
    if not resources:
        resources = _extract_youtube_urls(json.dumps(data), citations)[:6]

    steps: list[LearnStep] = []
    for raw in data.get("steps", []):
        resource = None
        idx = raw.get("resource_index")
        if idx is not None and isinstance(idx, int) and 0 <= idx < len(resources):
            resource = resources[idx]
        steps.append(
            LearnStep(
                id=str(raw.get("id", f"step-{len(steps) + 1}")),
                title=str(raw.get("title", f"Step {len(steps) + 1}")),
                content=str(raw.get("content", "")),
                check_items=[LearnCheckItem.model_validate(c) for c in raw.get("check_items", [])],
                resource=resource,
            )
        )

    content = LearnContent(
        summary=str(data.get("summary", lesson.description)),
        steps=steps,
        resources=resources,
    )
    return _attach_resources_to_steps(content)


async def generate_resources(lesson: Lesson) -> LearnContent:
    """Generate full interactive learn content (replaces plain resource list)."""
    return await generate_learn_content(lesson)


async def generate_flashcards(lesson: Lesson) -> list[FlashcardItem]:
    messages = [
        {
            "role": "system",
            "content": (
                "Create flashcards for learning. Return valid JSON only: "
                '{"flashcards": [{"front": "term or question", "back": "2-3 sentence explanation"}]} '
                "Create 5-8 cards."
            ),
        },
        {
            "role": "user",
            "content": f"Create flashcards for lesson: {lesson.title}. {lesson.description}",
        },
    ]
    data, _ = await chat_completion_json(messages)
    return [FlashcardItem.model_validate(f) for f in data.get("flashcards", [])]


async def generate_quiz(lesson: Lesson) -> list[QuizItem]:
    messages = [
        {
            "role": "system",
            "content": (
                "Create a multiple choice quiz. Return valid JSON only: "
                '{"quiz": [{"question": "...", "options": ["A","B","C","D"], "correct": "B", "explanation": "..."}]} '
                "Create exactly 5 questions. correct must match one of the options exactly."
            ),
        },
        {
            "role": "user",
            "content": f"Create quiz for lesson: {lesson.title}. {lesson.description}",
        },
    ]
    data, _ = await chat_completion_json(messages)
    return [QuizItem.model_validate(q) for q in data.get("quiz", [])]


async def generate_lesson_content(
    db: Session,
    lesson: Lesson,
    content_type: str,
) -> dict:
    if content_type in ("resources", "learn"):
        content = await generate_learn_content(lesson)
        lesson.learn_content = json.dumps(content.model_dump())
        lesson.resources = json.dumps([r.model_dump() for r in content.resources])
    elif content_type == "flashcards":
        items = await generate_flashcards(lesson)
        lesson.flashcards = json.dumps([i.model_dump() for i in items])
    elif content_type == "quiz":
        items = await generate_quiz(lesson)
        lesson.quiz = json.dumps([i.model_dump() for i in items])
    else:
        raise ValueError(f"Unknown content type: {content_type}")

    db.commit()
    db.refresh(lesson)
    return {
        "learn_content": lesson.learn_content,
        "resources": lesson.resources,
        "flashcards": lesson.flashcards,
        "quiz": lesson.quiz,
    }
