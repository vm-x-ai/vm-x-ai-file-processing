from os import environ

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class BastionSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="BASTION_",
    )
    instance_id_ssm_name: str = Field(
        default_factory=lambda: (
            f"/{environ.get('RESOURCE_PREFIX')}-app/"
            f"{environ.get('ENV', 'local')}/bastion-host/instance-id"
        )
    )


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="DB_",
    )

    scheme: str = "postgresql+psycopg"
    user: str | None = None
    password: str | None = None
    host: str | None = None
    ro_host: str | None = None
    port: int | None = None
    name: str | None = None
    secret_name: str = Field(
        default_factory=lambda: (
            f"{environ.get('RESOURCE_PREFIX')}-app-"
            f"database-secret-{environ.get('ENV', 'local')}"
        )
    )


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file, env_file_encoding="utf-8", extra="ignore"
    )
    log_level: str = "INFO"
    env: str = "local"
    db: DatabaseSettings = DatabaseSettings()
    bastion_host: BastionSettings = BastionSettings()
