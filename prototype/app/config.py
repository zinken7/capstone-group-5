from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Autonomous Mining Equipment Market Map"
    environment: str = "development"
    database_url: str = "sqlite:///./mining.sqlite3"
    admin_api_key: str = "change-me-before-deployment"
    secret_key: str = "change-me"
    seed_demo_data: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
