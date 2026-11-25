from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import List, Optional
import os
import secrets

# Values that mean "not configured" (empty, or the .env.example placeholder)
_SECRET_KEY_PLACEHOLDER_PREFIX = "your-secret-key"
_DEV_SECRET_KEY_FILE = Path(
    os.getenv("DEV_SECRET_KEY_FILE", Path(__file__).resolve().parents[2] / "storage" / ".dev_secret_key")
)


def _load_or_create_dev_secret_key(path: Path = _DEV_SECRET_KEY_FILE) -> str:
    """Return a dev-only signing key that is stable across processes and restarts.

    A per-process random key invalidates every token on each --reload and makes
    tokens minted by one worker unusable in another, so persist one to disk.
    """
    try:
        key = path.read_text(encoding="utf-8").strip()
        if key:
            return key
    except FileNotFoundError:
        pass
    path.parent.mkdir(parents=True, exist_ok=True)
    key = secrets.token_urlsafe(48)
    try:
        # "x" = exclusive create: if another process won the race, use its key
        with open(path, "x", encoding="utf-8") as f:
            f.write(key)
        os.chmod(path, 0o600)
        return key
    except FileExistsError:
        return path.read_text(encoding="utf-8").strip()


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Content Intelligence OS"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/content_intelligence"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # AI Providers (see app/services/llm.py). Set the key for any one provider;
    # LLM_PROVIDER picks one explicitly when several keys are set, LLM_MODEL
    # overrides that provider's default model.
    LLM_PROVIDER: Optional[str] = None
    LLM_MODEL: Optional[str] = None
    LLM_TIMEOUT_SECONDS: float = 120.0
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None  # older name for GEMINI_API_KEY
    MISTRAL_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    DEEPSEEK_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: Optional[str] = None  # e.g. http://host.docker.internal:11434/v1
    ELEVENLABS_API_KEY: Optional[str] = None
    # Daily background discovery for every early-stage project. Off by default:
    # each run searches YouTube and calls the paid LLM once per project.
    AUTO_DISCOVERY_ENABLED: bool = False

    # Social Media APIs
    YOUTUBE_API_KEY: Optional[str] = None
    YOUTUBE_CLIENT_ID: Optional[str] = None
    YOUTUBE_CLIENT_SECRET: Optional[str] = None
    TIKTOK_CLIENT_KEY: Optional[str] = None
    TIKTOK_CLIENT_SECRET: Optional[str] = None
    INSTAGRAM_APP_ID: Optional[str] = None
    INSTAGRAM_APP_SECRET: Optional[str] = None
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None

    # Storage
    STORAGE_TYPE: str = "local"
    LOCAL_STORAGE_PATH: str = "./storage"
    S3_BUCKET: Optional[str] = None
    S3_REGION: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None

    # Monitoring
    SENTRY_DSN: Optional[str] = None
    PROMETHEUS_PORT: int = 9090

    class Config:
        env_file = ".env"
        case_sensitive = True

    @model_validator(mode="after")
    def _resolve_secret_key(self) -> "Settings":
        if self.SECRET_KEY and not self.SECRET_KEY.startswith(_SECRET_KEY_PLACEHOLDER_PREFIX):
            return self
        if not self.DEBUG:
            raise ValueError(
                "SECRET_KEY must be set to a real value when DEBUG is false "
                "(generate one with: openssl rand -base64 32)"
            )
        self.SECRET_KEY = _load_or_create_dev_secret_key()
        return self


settings = Settings()