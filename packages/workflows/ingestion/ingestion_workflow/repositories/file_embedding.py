from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class FileEmbeddingRepository(
    BaseRepository[
        UUID, models.FileEmbedding, models.FileEmbeddingRead, models.FileEmbeddingCreate
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
            models.FileEmbedding,
            models.FileEmbeddingRead,
            models.FileEmbeddingCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.FileEmbedding.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.FileEmbedding.id) == id

    async def get_by_file_id(self, file_id: UUID) -> list[models.FileEmbeddingRead]:
        async with self._session_factory() as session:
            query = select(models.FileEmbedding).where(
                models.FileEmbedding.file_id == file_id
            )

            result = await session.scalars(query)

            return [
                models.FileEmbeddingRead.model_validate(embedding)
                for embedding in result.all()
            ]
