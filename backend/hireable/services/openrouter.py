import json
import logging
import re
from typing import Any

import httpx

from hireable.config import settings

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _strip_markdown_fences(content: str) -> str:
    text = content.strip()
    if text.startswith("```"):
        text = _FENCE_RE.sub("", text).strip()
    return text


def _extract_json_text(content: str) -> str:
    text = _strip_markdown_fences(content)
    try:
        json.loads(text)
        return text
    except json.JSONDecodeError:
        pass
    for pattern in (r"\{[\s\S]*\}", r"\[[\s\S]*\]"):
        match = re.search(pattern, text)
        if match:
            candidate = match.group()
            try:
                json.loads(candidate)
                return candidate
            except json.JSONDecodeError:
                continue
    return text


def _normalize_parsed_json(parsed: Any) -> dict[str, Any]:
    if isinstance(parsed, dict):
        return parsed
    if isinstance(parsed, list):
        if parsed and isinstance(parsed[0], dict):
            if "title" in parsed[0] and "company" in parsed[0]:
                return {"jobs": parsed}
            if "required_skills" in parsed[0]:
                return parsed[0]
        return {"items": parsed}
    raise ValueError(f"Expected JSON object, got {type(parsed).__name__}")


async def chat_completion(
    messages: list[dict[str, str]],
    model: str | None = None,
    json_mode: bool = True,
    web_search: bool = False,
    max_results: int = 5,
) -> tuple[str, list[dict[str, Any]]]:
    """Call OpenRouter chat completions. Returns (content, citations)."""
    payload: dict[str, Any] = {
        "model": model or settings.default_model,
        "messages": messages,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    if web_search:
        payload["plugins"] = [{"id": "web", "max_results": max_results}]

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://hireable.app",
        "X-Title": "Hireable",
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()

    choice = data["choices"][0]["message"]
    content = choice.get("content", "") or ""
    citations: list[dict[str, Any]] = []
    for annotation in choice.get("annotations", []):
        if annotation.get("type") == "url_citation":
            citations.append(annotation.get("url_citation", {}))
    return content, citations


async def chat_completion_json(
    messages: list[dict[str, str]],
    model: str | None = None,
    web_search: bool = False,
    max_results: int = 5,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Call OpenRouter and parse JSON response with retries."""
    last_error: Exception | None = None
    last_content = ""
    current_messages = list(messages)

    for attempt in range(3):
        try:
            content, citations = await chat_completion(
                messages=current_messages,
                model=model,
                json_mode=True,
                web_search=web_search,
                max_results=max_results,
            )
            last_content = content
            json_text = _extract_json_text(content)
            parsed = json.loads(json_text)
            return _normalize_parsed_json(parsed), citations
        except (json.JSONDecodeError, ValueError, KeyError) as exc:
            last_error = exc
            logger.warning(
                "JSON parse failed (attempt %s): %s | preview: %s",
                attempt + 1,
                exc,
                last_content[:200],
            )
            current_messages = current_messages + [
                {"role": "assistant", "content": last_content},
                {
                    "role": "user",
                    "content": (
                        "Your reply must be a single JSON object (not an array). "
                        "No markdown fences, no prose. Example: {\"key\": \"value\"}."
                    ),
                },
            ]

    raise ValueError(f"Failed to parse JSON from model: {last_error}")
