from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

import vmxfp_db_models
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class EvaluationTemplateRepository(
    BaseRepository[
        UUID,
        vmxfp_db_models.EvaluationTemplate,
        vmxfp_db_models.EvaluationTemplateRead,
        vmxfp_db_models.EvaluationTemplateCreate,
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
            vmxfp_db_models.EvaluationTemplate,
            vmxfp_db_models.EvaluationTemplateRead,
            vmxfp_db_models.EvaluationTemplateCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], vmxfp_db_models.EvaluationTemplate.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(vmxfp_db_models.EvaluationTemplate.id) == id

    async def get_by_project_id(
        self, project_id: UUID
    ) -> list[vmxfp_db_models.EvaluationTemplateRead]:
        async with self._session_factory() as session:
            query = (
                select(vmxfp_db_models.EvaluationTemplate)
                .where(vmxfp_db_models.EvaluationTemplate.project_id == project_id)
                .order_by(col(vmxfp_db_models.EvaluationTemplate.created_at).asc())
            )

            result = await session.scalars(query)

            return [
                vmxfp_db_models.EvaluationTemplateRead.model_validate(template)
                for template in result.all()
            ]

    async def get_default_by_category_id(
        self, category_id: UUID
    ) -> list[vmxfp_db_models.EvaluationTemplateRead]:
        async with self._session_factory() as session:
            query = select(vmxfp_db_models.EvaluationTemplate).where(
                vmxfp_db_models.EvaluationTemplate.category_id == category_id,
                col(vmxfp_db_models.EvaluationTemplate.default).is_(True),
            )

            result = await session.scalars(query)

            return [
                vmxfp_db_models.EvaluationTemplateRead.model_validate(template)
                for template in result.all()
            ]
