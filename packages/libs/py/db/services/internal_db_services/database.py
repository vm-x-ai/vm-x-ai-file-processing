"""Database module."""

import logging
from asyncio import current_task
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

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


class Database:
    def __init__(
        self,
        db_url: PostgresDsn,
        db_ro_url: PostgresDsn,
        logging_name: str = "",
    ) -> None:
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
            str(db_ro_url),
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
