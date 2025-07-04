from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

import vmxfp_db_models
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class FileContentRepository(
    BaseRepository[
        UUID,
        vmxfp_db_models.FileContent,
        vmxfp_db_models.FileContentRead,
        vmxfp_db_models.FileContentCreate,
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
            vmxfp_db_models.FileContent,
            vmxfp_db_models.FileContentRead,
            vmxfp_db_models.FileContentCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], vmxfp_db_models.FileContent.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(vmxfp_db_models.FileContent.id) == id

    async def get_by_file_id(
        self, file_id: UUID
    ) -> list[vmxfp_db_models.FileEmbeddingRead]:
        async with self._session_factory() as session:
            query = select(vmxfp_db_models.FileContent).where(
                vmxfp_db_models.FileContent.file_id == file_id
            )

            result = await session.scalars(query)

            return [
                vmxfp_db_models.FileContentRead.model_validate(content)
                for content in result.all()
            ]

    async def get_by_file_id_and_page(
        self, file_id: UUID, from_page: int, to_page: int | None
    ) -> list[vmxfp_db_models.FileContentRead]:
        async with self._session_factory() as session:
            query = (
                select(vmxfp_db_models.FileContent)
                .where(vmxfp_db_models.FileContent.file_id == file_id)
                .where(vmxfp_db_models.FileContent.content_number >= from_page)
                .order_by(vmxfp_db_models.FileContent.content_number)
            )

            if to_page:
                query = query.where(
                    vmxfp_db_models.FileContent.content_number <= to_page
                )

            result = await session.scalars(query)

            return [
                vmxfp_db_models.FileContentRead.model_validate(content)
                for content in result.all()
            ]
