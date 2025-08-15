from os import environ

from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class IngestionCallbackSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="INGESTION_CALLBACK_",
    )

    url: str


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file, env_file_encoding="utf-8", extra="ignore"
    )
    log_level: str = "INFO"
    sqlalchemy_log_level: str = "INFO"
    ingestion_callback: IngestionCallbackSettings = IngestionCallbackSettings()
