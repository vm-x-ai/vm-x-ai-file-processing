from contextlib import AbstractAsyncContextManager
from typing import Callable, Optional, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class EvaluationRepository(
    BaseRepository[
        UUID, models.Evaluation, models.EvaluationRead, models.EvaluationCreate
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
            models.Evaluation,
            models.EvaluationRead,
            models.EvaluationCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.Evaluation.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.Evaluation.id) == id

    async def get_by_project_id(
        self,
        project_id: UUID,
    ) -> list[models.EvaluationRead]:
        async with self._session_factory() as session:
            query = (
                select(models.Evaluation)
                .where(models.Evaluation.project_id == project_id)
                .order_by(col(models.Evaluation.created_at).desc())
            )

            result = await session.scalars(query)

            return [
                models.EvaluationRead.model_validate(evaluation)
                for evaluation in result.all()
            ]

    async def get_by_project_id_and_parent_evaluation_id(
        self,
        project_id: UUID,
        parent_evaluation_id: Optional[UUID] = None,
        parent_evaluation_option: Optional[str] = None,
    ) -> list[models.EvaluationRead]:
        async with self._session_factory() as session:
            query = select(models.Evaluation).where(
                models.Evaluation.project_id == project_id
            )

            if parent_evaluation_id is not None:
                query = query.where(
                    col(models.Evaluation.parent_evaluation_id) == parent_evaluation_id
                )
            else:
                query = query.where(
                    col(models.Evaluation.parent_evaluation_id).is_(None)
                )

            if parent_evaluation_option is not None:
                query = query.where(
                    col(models.Evaluation.parent_evaluation_option)
                    == parent_evaluation_option
                )
            else:
                query = query.where(
                    col(models.Evaluation.parent_evaluation_option).is_(None)
                )

            result = await session.scalars(query)

            return [
                models.EvaluationRead.model_validate(evaluation)
                for evaluation in result.all()
            ]
