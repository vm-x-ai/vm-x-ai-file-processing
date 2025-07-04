from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID, uuid4

import vmxfp_db_models
from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class EvaluationCategoryRepository(
    BaseRepository[
        UUID,
        vmxfp_db_models.EvaluationCategory,
        vmxfp_db_models.EvaluationCategoryRead,
        vmxfp_db_models.EvaluationCategoryCreate,
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
            vmxfp_db_models.EvaluationCategory,
            vmxfp_db_models.EvaluationCategoryRead,
            vmxfp_db_models.EvaluationCategoryCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], vmxfp_db_models.EvaluationCategory.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(vmxfp_db_models.EvaluationCategory.id) == id

    async def get_by_project_id(
        self, project_id: UUID
    ) -> list[vmxfp_db_models.EvaluationCategoryRead]:
        """Get all evaluation categories for a specific project."""
        async with self._session_factory() as session:
            query = (
                select(vmxfp_db_models.EvaluationCategory)
                .where(vmxfp_db_models.EvaluationCategory.project_id == project_id)
                .order_by(col(vmxfp_db_models.EvaluationCategory.name))
            )
            result = await session.scalars(query)
            return [
                vmxfp_db_models.EvaluationCategoryRead.model_validate(category)
                for category in result.all()
            ]

    async def get_by_name_and_project(
        self, name: str, project_id: UUID
    ) -> vmxfp_db_models.EvaluationCategoryRead | None:
        """Get an evaluation category by name within a specific project."""
        async with self._session_factory() as session:
            query = select(vmxfp_db_models.EvaluationCategory).where(
                vmxfp_db_models.EvaluationCategory.name == name,
                vmxfp_db_models.EvaluationCategory.project_id == project_id,
            )
            result = await session.scalars(query)
            category = result.first()
            return (
                vmxfp_db_models.EvaluationCategoryRead.model_validate(category)
                if category
                else None
            )

    async def create_default_category(
        self, project_id: UUID
    ) -> vmxfp_db_models.EvaluationCategoryRead:
        """Create a default evaluation category for a project."""
        default_category = vmxfp_db_models.EvaluationCategoryCreate(
            id=uuid4(),
            name="default",
            description="Default evaluation category",
            project_id=project_id,
        )
        return await self.create(default_category)

    async def ensure_default_category_exists(
        self, project_id: UUID
    ) -> vmxfp_db_models.EvaluationCategoryRead:
        """Ensure a default category exists for the project, create if it doesn't."""
        existing_default = await self.get_by_name_and_project("default", project_id)
        if existing_default:
            return existing_default
        return await self.create_default_category(project_id)

    async def find_or_create_by_name(
        self, name: str, project_id: UUID, description: str | None = None
    ) -> vmxfp_db_models.EvaluationCategoryRead:
        """Find an existing category by name or create a new one."""
        existing_category = await self.get_by_name_and_project(name, project_id)
        if existing_category:
            return existing_category

        new_category = vmxfp_db_models.EvaluationCategoryCreate(
            id=uuid4(),
            name=name,
            description=description or f"Category: {name}",
            project_id=project_id,
        )
        return await self.add(new_category)
