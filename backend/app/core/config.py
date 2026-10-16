from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Awgu StepForward API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+asyncpg://awgu:awgu@localhost:5432/awgu"

    cors_origins: list[str] = ["http://localhost:3000"]

    session_cookie_name: str = "awgu_session"
    csrf_cookie_name: str = "awgu_csrf"
    session_ttl_hours: int = 24 * 7
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    # Dev-only OTP/session bootstrap. Must be False in production.
    dev_auth_enabled: bool = True

    # Dev convenience: apply migrations and seed sample data on startup.
    dev_bootstrap: bool = True

    # Messaging adapters (DECISIONS D3/D4). Week 1 only has "console": messages
    # are logged, never delivered to a real person.
    email_provider: str = "console"
    sms_provider: str = "console"
    # Remind about saved listings this many days before their deadline.
    reminder_deadline_days: int = 3
    # Remind about registered sessions this many hours before they start.
    reminder_session_hours: int = 24

    # Opportunity assistant (spec R46/R48, DECISIONS D6). Off by default; when
    # off, ordinary search is the only path and stays fully usable.
    ai_enabled: bool = False

    # Secret mixed into hashed reporter fingerprints for report rate limits.
    # Override in every non-development environment.
    report_hash_secret: str = "dev-only-report-secret"
    report_rate_limit_per_hour: int = 5

    # Profile pictures: largest upload accepted, and the stored square size.
    avatar_max_upload_bytes: int = 5 * 1024 * 1024
    avatar_size_px: int = 256


@lru_cache
def get_settings() -> Settings:
    return Settings()
