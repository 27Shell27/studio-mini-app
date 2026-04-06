from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    app_name: str = "Studio Mini App"
    api_prefix: str = "/api/v1"

    database_url: str = "sqlite+aiosqlite:///./app.db"

    # auth
    auth_secret: str = "dev-secret-key"
    secret_key: str = "dev-secret-key"
    algorithm: str = "HS256"
    auth_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    # telegram
    telegram_bot_token: str = "dev-bot-token"

    # admin
    admin_telegram_ids: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()