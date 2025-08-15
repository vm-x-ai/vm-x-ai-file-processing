from os import environ

from internal_utils.pydantic_settings_jinja import jinja_template_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class ThumbnailSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="THUMBNAIL_",
    )

    s3_bucket_name: str

    @jinja_template_validator("s3_bucket_name")
    @classmethod
    def resolve_jinja_templates(cls, value): ...


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file, env_file_encoding="utf-8", extra="ignore"
    )
    log_level: str = "INFO"
    sqlalchemy_log_level: str = "INFO"
    thumbnail: ThumbnailSettings = ThumbnailSettings()
    event_bus_name: str
