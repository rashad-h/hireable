from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_DB = _BACKEND_DIR / "hireable.db"


def _resolve_sqlite_url(url: str) -> str:
    """Map relative sqlite paths to backend/ so cwd doesn't matter."""
    prefix = "sqlite:///"
    if not url.startswith(prefix):
        return url
    path_part = url[len(prefix) :]
    # Already absolute on Unix (sqlite:////var/...) or Windows drive letter
    if path_part.startswith("/") or (len(path_part) > 1 and path_part[1] == ":"):
        return url
    rel = path_part[2:] if path_part.startswith("./") else path_part
    return f"sqlite:///{(_BACKEND_DIR / rel).resolve()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    openrouter_api_key: str = ""
    database_url: str = f"sqlite:///{_DEFAULT_DB}"
    default_model: str = "google/gemini-2.5-flash"
    uploads_dir: str = str(_BACKEND_DIR / "uploads")

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        return _resolve_sqlite_url(value)


settings = Settings()
