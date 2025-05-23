from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class FileContentRepository(
    BaseRepository[
        UUID, models.FileContent, models.FileContentRead, models.FileContentCreate
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
            models.FileContent,
            models.FileContentRead,
            models.FileContentCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.FileContent.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.FileContent.id) == id

    async def get_by_file_id(self, file_id: UUID) -> list[models.FileEmbeddingRead]:
        async with self._session_factory() as session:
            query = select(models.FileContent).where(
                models.FileContent.file_id == file_id
            )

            result = await session.scalars(query)

            return [
                models.FileContentRead.model_validate(content)
                for content in result.all()
            ]
