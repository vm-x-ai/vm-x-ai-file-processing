from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class FileRepository(
    BaseRepository[UUID, models.File, models.FileRead, models.FileCreate]
):
    def __init__(
        self,
        session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
        write_session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
    ):
        super().__init__(
            session_factory,
            write_session_factory,
            models.File,
            models.FileRead,
            models.FileCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.File.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.File.id) == id

    async def get_by_project_id(
        self,
        project_id: UUID,
    ) -> list[models.FileRead]:
        async with self._session_factory() as session:
            query = (
                select(models.File)
                .where(models.File.project_id == project_id)
                .order_by(col(models.File.created_at).desc())
            )
            result = await session.scalars(query)
            return [models.FileRead.model_validate(file) for file in result.all()]
