from typing import Optional, cast
from uuid import UUID

import internal_db_models
from internal_db_services.database import Database
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlalchemy.orm import selectinload
from sqlmodel import col

from .base import BaseRepository


class EvaluationRepository(
    BaseRepository[
        UUID,
        internal_db_models.Evaluation,
        internal_db_models.EvaluationRead,
        internal_db_models.EvaluationCreate,
    ]
):
    def __init__(
        self,
        db: Database,
    ):
        super().__init__(
            db,
            internal_db_models.Evaluation,
            internal_db_models.EvaluationRead,
            internal_db_models.EvaluationCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], internal_db_models.Evaluation.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(internal_db_models.Evaluation.id) == id

    async def get_by_project_id(
        self,
        project_id: UUID,
    ) -> list[internal_db_models.EvaluationRead]:
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.Evaluation)
                .where(internal_db_models.Evaluation.project_id == project_id)
                .order_by(col(internal_db_models.Evaluation.created_at).asc())
            )

            result = await session.scalars(query)

            return [
                internal_db_models.EvaluationRead.model_validate(evaluation)
                for evaluation in result.all()
            ]

    async def get_by_project_id_and_parent_evaluation_id(
        self,
        project_id: UUID,
        parent_evaluation_id: Optional[UUID] = None,
        parent_evaluation_option: Optional[str] = None,
    ) -> list[internal_db_models.EvaluationReadWithTemplate]:
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.Evaluation)
                .where(internal_db_models.Evaluation.project_id == project_id)
                .options(selectinload(internal_db_models.Evaluation.template))
            )

            if parent_evaluation_id is not None:
                query = query.where(
                    col(internal_db_models.Evaluation.parent_evaluation_id)
                    == parent_evaluation_id
                )
            else:
                query = query.where(
                    col(internal_db_models.Evaluation.parent_evaluation_id).is_(None)
                )

            if parent_evaluation_option is not None:
                query = query.where(
                    col(internal_db_models.Evaluation.parent_evaluation_option)
                    == parent_evaluation_option
                )
            else:
                query = query.where(
                    col(internal_db_models.Evaluation.parent_evaluation_option).is_(
                        None
                    )
                )

            result = await session.scalars(query)

            return [
                internal_db_models.EvaluationReadWithTemplate.model_validate(evaluation)
                for evaluation in result.all()
            ]

    async def get_by_category_id(
        self,
        project_id: UUID,
        category_id: UUID,
    ) -> list[internal_db_models.EvaluationRead]:
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.Evaluation)
                .where(
                    internal_db_models.Evaluation.project_id == project_id,
                    internal_db_models.Evaluation.category_id == category_id,
                )
                .order_by(col(internal_db_models.Evaluation.created_at).desc())
            )

            result = await session.scalars(query)

            return [
                internal_db_models.EvaluationRead.model_validate(evaluation)
                for evaluation in result.all()
            ]
