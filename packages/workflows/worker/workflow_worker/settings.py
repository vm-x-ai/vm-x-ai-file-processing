from os import environ

from internal_utils.pydantic_settings_jinja import jinja_template_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class OpenAISettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="OPENAI_",
    )

    api_key: str


class VMXSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="VMX_",
    )

    domain: str
    api_key: str
    workspace_id: str
    environment_id: str
    resource_id: str


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


class Landing(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="LANDING_",
    )

    s3_bucket_name: str

    @jinja_template_validator("s3_bucket_name")
    @classmethod
    def resolve_jinja_templates(cls, value): ...


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
    openai: OpenAISettings = OpenAISettings()
    vmx: VMXSettings = VMXSettings()
    thumbnail: ThumbnailSettings = ThumbnailSettings()
    landing: Landing = Landing()
    ingestion_callback: IngestionCallbackSettings = IngestionCallbackSettings()
    event_bus_name: str

    @jinja_template_validator("event_bus_name")
    @classmethod
    def resolve_jinja_templates(cls, value): ...
