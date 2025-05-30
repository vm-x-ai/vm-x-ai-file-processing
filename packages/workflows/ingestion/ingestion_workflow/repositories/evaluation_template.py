from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class EvaluationTemplateRepository(
    BaseRepository[
        UUID,
        models.EvaluationTemplate,
        models.EvaluationTemplateRead,
        models.EvaluationTemplateCreate,
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
            models.EvaluationTemplate,
            models.EvaluationTemplateRead,
            models.EvaluationTemplateCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.EvaluationTemplate.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.EvaluationTemplate.id) == id

    async def get_by_project_id(
        self, project_id: UUID
    ) -> list[models.EvaluationTemplateRead]:
        async with self._session_factory() as session:
            query = (
                select(models.EvaluationTemplate)
                .where(models.EvaluationTemplate.project_id == project_id)
                .order_by(col(models.EvaluationTemplate.created_at).asc())
            )

            result = await session.scalars(query)

            return [
                models.EvaluationTemplateRead.model_validate(template)
                for template in result.all()
            ]

    async def get_default_by_category_id(
        self, category_id: UUID
    ) -> list[models.EvaluationTemplateRead]:
        async with self._session_factory() as session:
            query = select(models.EvaluationTemplate).where(
                models.EvaluationTemplate.category_id == category_id,
                col(models.EvaluationTemplate.default).is_(True),
            )

            result = await session.scalars(query)

            return [
                models.EvaluationTemplateRead.model_validate(template)
                for template in result.all()
            ]
