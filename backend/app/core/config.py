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


@lru_cache
def get_settings() -> Settings:
    return Settings()
