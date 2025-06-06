from os import environ

from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="DB_",
    )
    url: PostgresDsn
    ro_url: PostgresDsn
