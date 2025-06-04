from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

import dm_db_models
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class EvaluationTemplateRepository(
    BaseRepository[
        UUID,
        dm_db_models.EvaluationTemplate,
        dm_db_models.EvaluationTemplateRead,
        dm_db_models.EvaluationTemplateCreate,
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
            dm_db_models.EvaluationTemplate,
            dm_db_models.EvaluationTemplateRead,
            dm_db_models.EvaluationTemplateCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], dm_db_models.EvaluationTemplate.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(dm_db_models.EvaluationTemplate.id) == id

    async def get_by_project_id(
        self, project_id: UUID
    ) -> list[dm_db_models.EvaluationTemplateRead]:
        async with self._session_factory() as session:
            query = (
                select(dm_db_models.EvaluationTemplate)
                .where(dm_db_models.EvaluationTemplate.project_id == project_id)
                .order_by(col(dm_db_models.EvaluationTemplate.created_at).asc())
            )

            result = await session.scalars(query)

            return [
                dm_db_models.EvaluationTemplateRead.model_validate(template)
                for template in result.all()
            ]

    async def get_default_by_category_id(
        self, category_id: UUID
    ) -> list[dm_db_models.EvaluationTemplateRead]:
        async with self._session_factory() as session:
            query = select(dm_db_models.EvaluationTemplate).where(
                dm_db_models.EvaluationTemplate.category_id == category_id,
                col(dm_db_models.EvaluationTemplate.default).is_(True),
            )

            result = await session.scalars(query)

            return [
                dm_db_models.EvaluationTemplateRead.model_validate(template)
                for template in result.all()
            ]
