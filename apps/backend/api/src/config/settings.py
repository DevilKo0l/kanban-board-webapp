from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[5]


class Settings(BaseSettings):
    app_env: str = Field(default="development", validation_alias="APP_ENV")
    app_host: str = Field(default="0.0.0.0", validation_alias="APP_HOST")
    app_port: int = Field(default=8000, validation_alias="APP_PORT")
    database_url: str = Field(
        default="sqlite:////app/data/kanban.db", validation_alias="DATABASE_URL"
    )
    dummy_username: str = Field(default="user", validation_alias="DUMMY_USERNAME")
    dummy_password: str = Field(default="password", validation_alias="DUMMY_PASSWORD")
    session_secret: str = Field(default="", validation_alias="SESSION_SECRET")
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="CORS_ORIGINS",
    )
    openrouter_api_key: str = Field(default="", validation_alias="OPENROUTER_API_KEY")
    openrouter_model: str = Field(
        default="openai/gpt-oss-120b", validation_alias="OPENROUTER_MODEL"
    )
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1", validation_alias="OPENROUTER_BASE_URL"
    )
    openrouter_timeout_seconds: int = Field(
        default=30, validation_alias="OPENROUTER_TIMEOUT_SECONDS"
    )
    openrouter_max_retries: int = Field(default=2, validation_alias="OPENROUTER_MAX_RETRIES")

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
