from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

import dm_db_models
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlalchemy.orm import selectinload
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class FileEvaluationRepository(
    BaseRepository[
        UUID,
        dm_db_models.FileEvaluation,
        dm_db_models.FileEvaluationRead,
        dm_db_models.FileEvaluationCreate,
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
            dm_db_models.FileEvaluation,
            dm_db_models.FileEvaluationRead,
            dm_db_models.FileEvaluationCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], dm_db_models.FileEvaluation.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(dm_db_models.FileEvaluation.id) == id

    async def get_by_file_id(
        self,
        project_id: UUID,
        file_id: UUID,
    ) -> list[dm_db_models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(dm_db_models.FileEvaluation)
                .options(selectinload(dm_db_models.FileEvaluation.file))
                .options(selectinload(dm_db_models.FileEvaluation.content))
                .options(selectinload(dm_db_models.FileEvaluation.evaluation))
                .join(dm_db_models.FileContent)
                .join(dm_db_models.Evaluation)
                .where(
                    dm_db_models.FileEvaluation.file_id == file_id,
                    dm_db_models.File.project_id == project_id,
                )
                .order_by(
                    col(dm_db_models.FileContent.content_number).asc(),
                    col(dm_db_models.Evaluation.title).asc(),
                )
            )

            result = await session.scalars(query)
            return [
                dm_db_models.FileEvaluationReadWithFile.model_validate(file_evaluation)
                for file_evaluation in result.all()
            ]

    async def get_by_evaluation_id(
        self,
        project_id: UUID,
        evaluation_id: UUID,
        option_value: str | None = None,
    ) -> list[dm_db_models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(dm_db_models.FileEvaluation)
                .options(selectinload(dm_db_models.FileEvaluation.file))
                .options(selectinload(dm_db_models.FileEvaluation.content))
                .options(selectinload(dm_db_models.FileEvaluation.evaluation))
                .where(
                    dm_db_models.FileEvaluation.evaluation_id == evaluation_id,
                    dm_db_models.File.project_id == project_id,
                )
                .order_by(col(dm_db_models.FileEvaluation.created_at).desc())
            )

            if option_value:
                query = query.where(
                    col(dm_db_models.FileEvaluation.response) == option_value
                )

            result = await session.scalars(query)
            return [
                dm_db_models.FileEvaluationReadWithFile.model_validate(file_evaluation)
                for file_evaluation in result.all()
            ]

    async def get_by_evaluation_id_and_content_id(
        self,
        project_id: UUID,
        evaluation_id: UUID,
        content_id: UUID,
    ) -> dm_db_models.FileEvaluationRead | None:
        async with self._session_factory() as session:
            query = (
                select(dm_db_models.FileEvaluation)
                .join(dm_db_models.File)
                .where(
                    dm_db_models.FileEvaluation.evaluation_id == evaluation_id,
                    dm_db_models.FileEvaluation.content_id == content_id,
                    dm_db_models.File.project_id == project_id,
                )
            )

            result = await session.scalar(query)
            if not result:
                return None

            return dm_db_models.FileEvaluationRead.model_validate(result)
