import json
import logging
from pathlib import Path

from pypdf import PdfReader

from hireable.models.schemas import CVData
from hireable.services.openrouter import chat_completion_json

logger = logging.getLogger(__name__)


def extract_pdf_text(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages = [page.extract_text() or "" for page in reader.pages]
    text = "\n".join(pages).strip()
    if len(text) < 50:
        raise ValueError("Could not extract enough text from PDF. Try a text-based CV, not a scanned image.")
    return text


async def parse_cv(file_path: str) -> CVData:
    text = extract_pdf_text(file_path)
    messages = [
        {
            "role": "system",
            "content": (
                "You extract structured CV/resume data. Return valid JSON only with keys: "
                "name, email, skills (array of strings), experience (array of {title, company, duration, description}), "
                "education (array of {degree, institution, year}), certifications (array of strings)."
            ),
        },
        {"role": "user", "content": f"Extract CV data from this text:\n\n{text[:12000]}"},
    ]
    data, _ = await chat_completion_json(messages)
    return CVData.model_validate(data)


def save_upload(upload_dir: str, filename: str, content: bytes) -> str:
    path = Path(upload_dir)
    path.mkdir(parents=True, exist_ok=True)
    file_path = path / filename
    file_path.write_bytes(content)
    return str(file_path)
