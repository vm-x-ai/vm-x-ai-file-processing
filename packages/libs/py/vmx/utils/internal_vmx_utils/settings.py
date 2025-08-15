from os import environ

from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class VMXSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="VMX_",
    )

    domain: str | None = None
    api_key: str | None = None
    workspace_id: str | None = None
    environment_id: str | None = None
    secret_name: str | None = None
    resource_id: str | None = None
