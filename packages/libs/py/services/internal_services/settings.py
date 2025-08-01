from os import environ
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class OpenAISettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="OPENAI_",
    )

    api_key: str | None = None
    secret_name: str | None = None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file, env_file_encoding="utf-8", extra="ignore"
    )
    workflow_engine: Literal["temporal", "step_functions"] = "temporal"
    openai: OpenAISettings = OpenAISettings()
