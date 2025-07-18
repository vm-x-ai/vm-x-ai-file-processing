from os import environ

from internal_utils import jinja_template_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

env_file = f".env.{environ.get('ENV', 'local')}"


class SQSConsumerSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="SQS_CONSUMER_",
    )
    queue_url: str
    max_number_of_messages: int = 10
    visibility_timeout: int = 30
    number_of_concurrent_tasks: int = 100
    wait_time_seconds: int = 1

    @jinja_template_validator("queue_url")
    @classmethod
    def resolve_jinja_templates(cls, value): ...
