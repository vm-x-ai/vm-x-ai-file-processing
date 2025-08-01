from typing import cast
from uuid import UUID

import internal_db_models
from internal_db_services.database import Database
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlalchemy.orm import selectinload
from sqlmodel import col

from .base import BaseRepository


class FileEvaluationRepository(
    BaseRepository[
        UUID,
        internal_db_models.FileEvaluation,
        internal_db_models.FileEvaluationRead,
        internal_db_models.FileEvaluationCreate,
    ]
):
    def __init__(
        self,
        db: Database,
    ):
        super().__init__(
            db,
            internal_db_models.FileEvaluation,
            internal_db_models.FileEvaluationRead,
            internal_db_models.FileEvaluationCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], internal_db_models.FileEvaluation.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(internal_db_models.FileEvaluation.id) == id

    async def get_by_file_id(
        self,
        project_id: UUID,
        file_id: UUID,
    ) -> list[internal_db_models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.FileEvaluation)
                .options(selectinload(internal_db_models.FileEvaluation.file))
                .options(selectinload(internal_db_models.FileEvaluation.content))
                .options(selectinload(internal_db_models.FileEvaluation.evaluation))
                .join(internal_db_models.FileContent)
                .join(internal_db_models.Evaluation)
                .where(
                    internal_db_models.FileEvaluation.file_id == file_id,
                    internal_db_models.File.project_id == project_id,
                )
                .order_by(
                    col(internal_db_models.FileContent.content_number).asc(),
                    col(internal_db_models.Evaluation.title).asc(),
                )
            )

            result = await session.scalars(query)
            return [
                internal_db_models.FileEvaluationReadWithFile.model_validate(
                    file_evaluation
                )
                for file_evaluation in result.all()
            ]

    async def get_by_evaluation_id(
        self,
        project_id: UUID,
        evaluation_id: UUID,
        option_value: str | None = None,
    ) -> list[internal_db_models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.FileEvaluation)
                .options(selectinload(internal_db_models.FileEvaluation.file))
                .options(selectinload(internal_db_models.FileEvaluation.content))
                .options(selectinload(internal_db_models.FileEvaluation.evaluation))
                .where(
                    internal_db_models.FileEvaluation.evaluation_id == evaluation_id,
                    internal_db_models.File.project_id == project_id,
                )
                .order_by(col(internal_db_models.FileEvaluation.created_at).desc())
            )

            if option_value:
                query = query.where(
                    col(internal_db_models.FileEvaluation.response) == option_value
                )

            result = await session.scalars(query)
            return [
                internal_db_models.FileEvaluationReadWithFile.model_validate(
                    file_evaluation
                )
                for file_evaluation in result.all()
            ]

    async def get_by_evaluation_id_and_content_id(
        self,
        project_id: UUID,
        evaluation_id: UUID,
        content_id: UUID,
    ) -> internal_db_models.FileEvaluationRead | None:
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.FileEvaluation)
                .join(internal_db_models.File)
                .where(
                    internal_db_models.FileEvaluation.evaluation_id == evaluation_id,
                    internal_db_models.FileEvaluation.content_id == content_id,
                    internal_db_models.File.project_id == project_id,
                )
            )

            result = await session.scalar(query)
            if not result:
                return None

            return internal_db_models.FileEvaluationRead.model_validate(result)
