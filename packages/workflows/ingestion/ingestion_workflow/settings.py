from os import environ

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class OpenAI(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="OPENAI_",
    )

    api_key: str


class VMX(BaseSettings):
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


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file, env_file_encoding="utf-8", extra="ignore"
    )
    log_level: str = "INFO"
    sqlalchemy_log_level: str = "INFO"
    fastapi_hot_reload: bool = Field(
        False, description="FastAPI hot reload, only True on local env"
    )
    db_url: PostgresDsn
    db_ro_url: PostgresDsn
    temporal_host: str
    openai: OpenAI = OpenAI()
    vmx: VMX = VMX()
