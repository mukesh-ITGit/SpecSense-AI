"""
Application settings loaded from environment variables / .env file.

CRITICAL JWT_SECRET_KEY rule:
  - NEVER generate a random secret at module load time.
  - The secret MUST remain stable across restarts so existing tokens remain valid.
  - Load from .env or environment variable JWT_SECRET_KEY.
  - The default fallback is used ONLY in development if .env is missing.
  - In production, always set JWT_SECRET_KEY explicitly.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

# Resolve .env from the project root (two levels up from this file: app/config.py)
_PROJECT_ROOT = Path(__file__).parent.parent.resolve()
_ENV_FILE = _PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = ""

    # Environment
    environment: str = "development"

    # ------------------------------------------------------------------
    # JWT — MUST be stable across restarts.
    # Override via .env: JWT_SECRET_KEY=<your-long-random-secret>
    # ------------------------------------------------------------------
    jwt_secret_key: str = "specsense_enterprise_secret_key_change_in_production_2026_stable"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours (1 day)
    refresh_token_expire_days: int = 30

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    # Typically left at default (SQLite file at app/database/app.db).
    # Override via DATABASE_URL in .env for PostgreSQL in production.
    database_url: str = ""

    # ------------------------------------------------------------------
    # CORS — comma-separated list of allowed origins
    # ------------------------------------------------------------------
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    # ------------------------------------------------------------------
    # SMTP (optional — failing to send email must NOT break auth)
    # ------------------------------------------------------------------
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse the comma-separated CORS origins into a list."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
