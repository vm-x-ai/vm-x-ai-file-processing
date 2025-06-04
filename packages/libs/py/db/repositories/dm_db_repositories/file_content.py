from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

import dm_db_models
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class FileContentRepository(
    BaseRepository[
        UUID,
        dm_db_models.FileContent,
        dm_db_models.FileContentRead,
        dm_db_models.FileContentCreate,
    ]
):
    def __init__(
        self,
        session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
        write_session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
    ):
        super().__init__(
            session_factory,
            write_session_factory,
            dm_db_models.FileContent,
            dm_db_models.FileContentRead,
            dm_db_models.FileContentCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], dm_db_models.FileContent.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(dm_db_models.FileContent.id) == id

    async def get_by_file_id(
        self, file_id: UUID
    ) -> list[dm_db_models.FileEmbeddingRead]:
        async with self._session_factory() as session:
            query = select(dm_db_models.FileContent).where(
                dm_db_models.FileContent.file_id == file_id
            )

            result = await session.scalars(query)

            return [
                dm_db_models.FileContentRead.model_validate(content)
                for content in result.all()
            ]
