from os import environ

from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file, env_file_encoding="utf-8", extra="ignore"
    )
    log_level: str = "INFO"
    db_url: PostgresDsn
    db_ro_url: PostgresDsn
