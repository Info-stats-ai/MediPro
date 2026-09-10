from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "test", "staging", "production"] = "development"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "medinotes"
    clerk_issuer: str = ""
    clerk_audience: str | None = None
    dev_auth_bypass: bool = False
    dev_user_id: str = "dev_user"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"
    max_upload_bytes: int = 20 * 1024 * 1024
    max_note_chars: int = 250_000
    summary_chunk_chars: int = 24_000
    rate_limit: str = "60/minute"
    admin_user_ids: str = ""
    storage_backend: Literal["local", "s3"] = "local"
    local_storage_path: str = "./data/uploads"
    s3_bucket: str = ""
    s3_endpoint_url: str | None = None
    s3_region: str = "auto"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""

    @model_validator(mode="after")
    def reject_unsafe_bypass(self) -> "Settings":
        if self.dev_auth_bypass and self.environment not in {"development", "test"}:
            raise ValueError("DEV_AUTH_BYPASS is forbidden outside development/test")
        return self

    @property
    def admins(self) -> set[str]:
        return {item.strip() for item in self.admin_user_ids.split(",") if item.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
