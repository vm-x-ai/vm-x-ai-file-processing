from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

import vmxfp_db_models
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlalchemy.orm import selectinload
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class FileEvaluationRepository(
    BaseRepository[
        UUID,
        vmxfp_db_models.FileEvaluation,
        vmxfp_db_models.FileEvaluationRead,
        vmxfp_db_models.FileEvaluationCreate,
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
            vmxfp_db_models.FileEvaluation,
            vmxfp_db_models.FileEvaluationRead,
            vmxfp_db_models.FileEvaluationCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], vmxfp_db_models.FileEvaluation.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(vmxfp_db_models.FileEvaluation.id) == id

    async def get_by_file_id(
        self,
        project_id: UUID,
        file_id: UUID,
    ) -> list[vmxfp_db_models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(vmxfp_db_models.FileEvaluation)
                .options(selectinload(vmxfp_db_models.FileEvaluation.file))
                .options(selectinload(vmxfp_db_models.FileEvaluation.content))
                .options(selectinload(vmxfp_db_models.FileEvaluation.evaluation))
                .join(vmxfp_db_models.FileContent)
                .join(vmxfp_db_models.Evaluation)
                .where(
                    vmxfp_db_models.FileEvaluation.file_id == file_id,
                    vmxfp_db_models.File.project_id == project_id,
                )
                .order_by(
                    col(vmxfp_db_models.FileContent.content_number).asc(),
                    col(vmxfp_db_models.Evaluation.title).asc(),
                )
            )

            result = await session.scalars(query)
            return [
                vmxfp_db_models.FileEvaluationReadWithFile.model_validate(
                    file_evaluation
                )
                for file_evaluation in result.all()
            ]

    async def get_by_evaluation_id(
        self,
        project_id: UUID,
        evaluation_id: UUID,
        option_value: str | None = None,
    ) -> list[vmxfp_db_models.FileEvaluationReadWithFile]:
        async with self._session_factory() as session:
            query = (
                select(vmxfp_db_models.FileEvaluation)
                .options(selectinload(vmxfp_db_models.FileEvaluation.file))
                .options(selectinload(vmxfp_db_models.FileEvaluation.content))
                .options(selectinload(vmxfp_db_models.FileEvaluation.evaluation))
                .where(
                    vmxfp_db_models.FileEvaluation.evaluation_id == evaluation_id,
                    vmxfp_db_models.File.project_id == project_id,
                )
                .order_by(col(vmxfp_db_models.FileEvaluation.created_at).desc())
            )

            if option_value:
                query = query.where(
                    col(vmxfp_db_models.FileEvaluation.response) == option_value
                )

            result = await session.scalars(query)
            return [
                vmxfp_db_models.FileEvaluationReadWithFile.model_validate(
                    file_evaluation
                )
                for file_evaluation in result.all()
            ]

    async def get_by_evaluation_id_and_content_id(
        self,
        project_id: UUID,
        evaluation_id: UUID,
        content_id: UUID,
    ) -> vmxfp_db_models.FileEvaluationRead | None:
        async with self._session_factory() as session:
            query = (
                select(vmxfp_db_models.FileEvaluation)
                .join(vmxfp_db_models.File)
                .where(
                    vmxfp_db_models.FileEvaluation.evaluation_id == evaluation_id,
                    vmxfp_db_models.FileEvaluation.content_id == content_id,
                    vmxfp_db_models.File.project_id == project_id,
                )
            )

            result = await session.scalar(query)
            if not result:
                return None

            return vmxfp_db_models.FileEvaluationRead.model_validate(result)
