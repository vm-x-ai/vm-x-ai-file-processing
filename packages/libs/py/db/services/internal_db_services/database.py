"""Database module."""

import json
import logging
from asyncio import current_task
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import aioboto3
from dependency_injector import resources
from internal_db_models.settings import DatabaseSettings
from pydantic import PostgresDsn
from sqlalchemy.ext.asyncio import (
    async_scoped_session,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

ENGINE_ECHO = False
POOL_ECHO = True
POOL_SIZE = 30
MAX_OVERFLOW = 20
POOL_RECYCLE = 3600


class Database(resources.AsyncResource):
    async def init(
        self,
        aioboto3_session: aioboto3.Session,
        db_settings: DatabaseSettings,
        logging_name: str = "",
    ) -> None:
        if not db_settings.host:
            async with aioboto3_session.client("secretsmanager") as client:
                raw_secret_value = await client.get_secret_value(
                    SecretId=db_settings.secret_name
                )
                secret_value = json.loads(raw_secret_value["SecretString"])
                db_settings.host = secret_value["host"]
                db_settings.port = int(secret_value["port"])
                db_settings.user = secret_value["username"]
                db_settings.password = secret_value["password"]
                db_settings.name = secret_value["dbname"]

        db_url = PostgresDsn.build(
            scheme=db_settings.scheme,
            username=db_settings.user,
            password=db_settings.password,
            host=db_settings.host,
            port=db_settings.port,
            path=db_settings.name,
        )

        engine = create_async_engine(
            str(db_url),
            logging_name=logging_name,
            echo=ENGINE_ECHO,
            echo_pool=POOL_ECHO,
            pool_size=POOL_SIZE,
            max_overflow=MAX_OVERFLOW,
            pool_recycle=POOL_RECYCLE,
        )
        self._engine = engine

        ro_engine = create_async_engine(
            str(db_settings.ro_url) if db_settings.ro_host else str(db_url),
            logging_name=f"{logging_name}-ro",
            echo=ENGINE_ECHO,
            echo_pool=POOL_ECHO,
            pool_size=POOL_SIZE,
            max_overflow=MAX_OVERFLOW,
            pool_recycle=POOL_RECYCLE,
        )
        self._ro_engine = ro_engine

        self._session_factory = async_scoped_session(
            async_sessionmaker(
                bind=ro_engine,
                autocommit=False,
                autoflush=False,
                class_=AsyncSession,
                expire_on_commit=False,
            ),
            scopefunc=current_task,
        )
        self._writer_session_factory = async_scoped_session(
            async_sessionmaker(
                bind=engine,
                autocommit=False,
                autoflush=False,
                class_=AsyncSession,
            ),
            scopefunc=current_task,
        )

        return self

    async def shutdown(self) -> None:
        await self._engine.dispose()
        await self._ro_engine.dispose()

    @asynccontextmanager
    async def session(self, **kwargs) -> AsyncGenerator[AsyncSession, None]:
        session: AsyncSession = self._session_factory(**kwargs)

        try:
            yield session
        except Exception:
            logger.exception("Session rollback because of exception")
            await session.rollback()
            raise
        finally:
            await session.close()

    @asynccontextmanager
    async def writer_session(self, **kwargs) -> AsyncGenerator[AsyncSession, None]:
        session: AsyncSession = self._writer_session_factory(**kwargs)

        try:
            yield session
        except Exception:
            logger.exception("Session rollback because of exception")
            await session.rollback()
            raise
        finally:
            await session.close()
