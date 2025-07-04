import json
import logging
from contextlib import contextmanager
from logging.config import fileConfig
from typing import TypedDict

import boto3
import botocore
import botocore.client
from vmxfp_logger import setup_logger
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context
from vmxfp_db_models import *  # noqa: F403
from vmxfp_db_models.session_manager import SessionManager
from vmxfp_db_models.settings import Settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

setup_logger()

logger = logging.getLogger(__name__)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = SQLModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def _get_parameter_value(client: botocore.client.BaseClient, name: str) -> str:
    return client.get_parameter(Name=name)["Parameter"]["Value"]


class DatabaseSecret(TypedDict):
    dbname: str
    engine: str
    host: str
    port: int
    username: str
    password: str


def _get_db_secret_value(
    client: botocore.client.BaseClient, name: str
) -> DatabaseSecret:
    return json.loads(client.get_secret_value(SecretId=name)["SecretString"])


@contextmanager
def setup_session_manager():
    settings = Settings()
    if settings.env == "local" and settings.db.url:
        logger.info("Using local database URL")
        yield settings.db.url
    else:
        logger.info("Using remote database URL")
        ssm_client = boto3.client("ssm")
        secrets_client = boto3.client("secretsmanager")

        bastion_instance_id = _get_parameter_value(
            ssm_client, settings.bastion_host.instance_id_ssm_name
        )

        logger.info(f"Bastion instance ID: {bastion_instance_id}")

        remote_db_secret = _get_db_secret_value(
            secrets_client, settings.remote_db.secret_name
        )

        logger.info(
            "Opening port forwarding tunnel to remote database ",
            f"host: {remote_db_secret['host']}",
            f"port: {remote_db_secret['port']}",
            f"username: {remote_db_secret['username']}",
            f"dbname: {remote_db_secret['dbname']}",
        )

        local_port = 5499

        with SessionManager(
            boto3.client("ssm"),
            Target=bastion_instance_id,
            DocumentName="AWS-StartPortForwardingSessionToRemoteHost",
            Parameters={
                "host": [
                    remote_db_secret["host"],
                ],
                "portNumber": [f"{remote_db_secret['port']}"],
                "localPortNumber": [f"{local_port}"],
            },
        ):
            logger.info("Port forwarding tunnel opened")
            creds = f"{remote_db_secret['username']}:{remote_db_secret['password']}"
            host = f"localhost:{local_port}"
            db_url = f"postgresql+psycopg://{creds}@{host}/{remote_db_secret['dbname']}"
            yield db_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    with setup_session_manager() as db_url:
        context.configure(
            url=db_url,
            target_metadata=target_metadata,
            literal_binds=True,
            dialect_opts={"paramstyle": "named"},
        )

        with context.begin_transaction():
            context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    with setup_session_manager() as db_url:
        configuration = config.get_section(config.config_ini_section, {})
        configuration["sqlalchemy.url"] = db_url

        connectable = engine_from_config(
            configuration,
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
            )

            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
