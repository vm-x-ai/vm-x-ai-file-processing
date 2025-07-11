from os import environ

from pydantic import Field, PostgresDsn, computed_field
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


class RemoteDBSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="REMOTE_DB_",
    )
    secret_name: str = Field(
        default_factory=lambda: (
            f"{environ.get('RESOURCE_PREFIX')}-app-"
            f"database-secret-{environ.get('ENV', 'local')}"
        )
    )


class DatabaseSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="DB_",
    )

    user: str | None = None
    password: str | None = None
    host: str | None = None
    ro_host: str | None = None
    port: int | None = None
    name: str | None = None

    @computed_field
    @property
    def url(self) -> str:
        return str(
            PostgresDsn.build(
                scheme="postgresql+psycopg",
                username=self.user,
                password=self.password,
                host=self.host,
                port=self.port,
                path=self.name,
            )
        )

    @computed_field
    @property
    def ro_url(self) -> str:
        return str(
            PostgresDsn.build(
                scheme="postgresql+psycopg",
                username=self.user,
                password=self.password,
                host=self.ro_host,
                port=self.port,
                path=self.name,
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
    remote_db: RemoteDBSettings = RemoteDBSettings()
