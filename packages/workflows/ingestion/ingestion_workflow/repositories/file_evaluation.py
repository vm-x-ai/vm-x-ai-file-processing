from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlalchemy.orm import selectinload
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class FileEvaluationRepository(
    BaseRepository[
        UUID,
        models.FileEvaluation,
        models.FileEvaluationRead,
        models.FileEvaluationCreate,
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
            models.FileEvaluation,
            models.FileEvaluationRead,
            models.FileEvaluationCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.FileEvaluation.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.FileEvaluation.id) == id

    
    async def get_by_file_id(
        self,
        project_id: UUID,
        file_id: UUID,
    ) -> list[models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(models.FileEvaluation)
                .options(selectinload(models.FileEvaluation.file))
                .options(selectinload(models.FileEvaluation.content))
                .options(selectinload(models.FileEvaluation.evaluation))
                .join(models.FileContent)
                .join(models.Evaluation)
                .where(
                    models.FileEvaluation.file_id == file_id,
                    models.File.project_id == project_id,
                )
                .order_by(
                    col(models.FileContent.content_number).asc(),
                    col(models.Evaluation.title).asc(),
                )
            )

            result = await session.scalars(query)
            return [
                models.FileEvaluationReadWithFile.model_validate(file_evaluation)
                for file_evaluation in result.all()
            ]

    
    async def get_by_evaluation_id(
        self,
        project_id: UUID,
        evaluation_id: UUID,
        option_value: str | None = None,
    ) -> list[models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(models.FileEvaluation)
                .options(selectinload(models.FileEvaluation.file))
                .options(selectinload(models.FileEvaluation.content))
                .options(selectinload(models.FileEvaluation.evaluation))
                .where(
                    models.FileEvaluation.evaluation_id == evaluation_id,
                    models.File.project_id == project_id,
                )
                .order_by(col(models.FileEvaluation.created_at).desc())
            )

            if option_value:
                query = query.where(col(models.FileEvaluation.response) == option_value)

            result = await session.scalars(query)
            return [
                models.FileEvaluationReadWithFile.model_validate(file_evaluation)
                for file_evaluation in result.all()
            ]
