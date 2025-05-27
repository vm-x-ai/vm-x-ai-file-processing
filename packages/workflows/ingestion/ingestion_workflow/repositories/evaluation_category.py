from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID, uuid4

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class EvaluationCategoryRepository(
    BaseRepository[
        UUID, models.EvaluationCategory, models.EvaluationCategoryRead, models.EvaluationCategoryCreate
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
            models.EvaluationCategory,
            models.EvaluationCategoryRead,
            models.EvaluationCategoryCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.EvaluationCategory.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.EvaluationCategory.id) == id

    async def get_by_project_id(self, project_id: UUID) -> list[models.EvaluationCategoryRead]:
        """Get all evaluation categories for a specific project."""
        async with self._session_factory() as session:
            query = (
                select(models.EvaluationCategory)
                .where(models.EvaluationCategory.project_id == project_id)
                .order_by(col(models.EvaluationCategory.name))
            )
            result = await session.scalars(query)
            return [
                models.EvaluationCategoryRead.model_validate(category)
                for category in result.all()
            ]

    async def get_by_name_and_project(self, name: str, project_id: UUID) -> models.EvaluationCategoryRead | None:
        """Get an evaluation category by name within a specific project."""
        async with self._session_factory() as session:
            query = select(models.EvaluationCategory).where(
                models.EvaluationCategory.name == name,
                models.EvaluationCategory.project_id == project_id
            )
            result = await session.scalars(query)
            category = result.first()
            return models.EvaluationCategoryRead.model_validate(category) if category else None

    async def create_default_category(self, project_id: UUID) -> models.EvaluationCategoryRead:
        """Create a default evaluation category for a project."""
        default_category = models.EvaluationCategoryCreate(
            id=uuid4(),
            name="default",
            description="Default evaluation category",
            project_id=project_id
        )
        return await self.create(default_category)

    async def ensure_default_category_exists(self, project_id: UUID) -> models.EvaluationCategoryRead:
        """Ensure a default category exists for the project, create if it doesn't."""
        existing_default = await self.get_by_name_and_project("default", project_id)
        if existing_default:
            return existing_default
        return await self.create_default_category(project_id)

    async def find_or_create_by_name(self, name: str, project_id: UUID, description: str | None = None) -> models.EvaluationCategoryRead:
        """Find an existing category by name or create a new one."""
        existing_category = await self.get_by_name_and_project(name, project_id)
        if existing_category:
            return existing_category
        
        new_category = models.EvaluationCategoryCreate(
            id=uuid4(),
            name=name,
            description=description or f"Category: {name}",
            project_id=project_id
        )
        return await self.add(new_category) 