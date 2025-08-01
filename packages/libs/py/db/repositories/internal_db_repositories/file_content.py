from typing import cast
from uuid import UUID

import internal_db_models
from internal_db_services.database import Database
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col

from .base import BaseRepository


class FileContentRepository(
    BaseRepository[
        UUID,
        internal_db_models.FileContent,
        internal_db_models.FileContentRead,
        internal_db_models.FileContentCreate,
    ]
):
    def __init__(
        self,
        db: Database,
    ):
        super().__init__(
            db,
            internal_db_models.FileContent,
            internal_db_models.FileContentRead,
            internal_db_models.FileContentCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], internal_db_models.FileContent.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(internal_db_models.FileContent.id) == id

    async def get_by_file_id(
        self, file_id: UUID
    ) -> list[internal_db_models.FileEmbeddingRead]:
        async with self._session_factory() as session:
            query = select(internal_db_models.FileContent).where(
                internal_db_models.FileContent.file_id == file_id
            )

            result = await session.scalars(query)

            return [
                internal_db_models.FileContentRead.model_validate(content)
                for content in result.all()
            ]

    async def get_by_file_id_and_page(
        self, file_id: UUID, from_page: int, to_page: int | None
    ) -> list[internal_db_models.FileContentRead]:
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.FileContent)
                .where(internal_db_models.FileContent.file_id == file_id)
                .where(internal_db_models.FileContent.content_number >= from_page)
                .order_by(internal_db_models.FileContent.content_number)
            )

            if to_page:
                query = query.where(
                    internal_db_models.FileContent.content_number <= to_page
                )

            result = await session.scalars(query)

            return [
                internal_db_models.FileContentRead.model_validate(content)
                for content in result.all()
            ]
