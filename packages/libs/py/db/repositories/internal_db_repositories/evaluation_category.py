from typing import cast
from uuid import UUID, uuid4

import internal_db_models
from internal_db_services.database import Database
from sqlalchemy import Column, ColumnExpressionArgument, exists, not_, select
from sqlalchemy.orm import selectinload
from sqlmodel import col

from .base import BaseRepository


class EvaluationCategoryRepository(
    BaseRepository[
        UUID,
        internal_db_models.EvaluationCategory,
        internal_db_models.EvaluationCategoryRead,
        internal_db_models.EvaluationCategoryCreate,
    ]
):
    def __init__(
        self,
        db: Database,
    ):
        super().__init__(
            db,
            internal_db_models.EvaluationCategory,
            internal_db_models.EvaluationCategoryRead,
            internal_db_models.EvaluationCategoryCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], internal_db_models.EvaluationCategory.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(internal_db_models.EvaluationCategory.id) == id

    async def get_by_project_id(
        self, project_id: UUID, has_evaluations: bool | None = None
    ) -> list[internal_db_models.EvaluationCategoryWithEvaluations]:
        """Get all evaluation categories for a specific project."""
        async with self._session_factory() as session:
            query = (
                select(internal_db_models.EvaluationCategory)
                .options(
                    selectinload(internal_db_models.EvaluationCategory.evaluations)
                )
                .where(internal_db_models.EvaluationCategory.project_id == project_id)
                .order_by(col(internal_db_models.EvaluationCategory.name))
            )
            if has_evaluations is not None:
                exists_query = exists(
                    select(1).where(
                        internal_db_models.Evaluation.category_id
                        == internal_db_models.EvaluationCategory.id,
                        internal_db_models.Evaluation.project_id == project_id,
                    )
                )

                query = query.where(
                    exists_query if has_evaluations else not_(exists_query)
                )
            result = await session.scalars(query)
            return [
                internal_db_models.EvaluationCategoryWithEvaluations.model_validate(
                    category
                )
                for category in result.all()
            ]

    async def get_by_name_and_project(
        self, name: str, project_id: UUID
    ) -> internal_db_models.EvaluationCategoryRead | None:
        """Get an evaluation category by name within a specific project."""
        async with self._session_factory() as session:
            query = select(internal_db_models.EvaluationCategory).where(
                internal_db_models.EvaluationCategory.name == name,
                internal_db_models.EvaluationCategory.project_id == project_id,
            )
            result = await session.scalars(query)
            category = result.first()
            return (
                internal_db_models.EvaluationCategoryRead.model_validate(category)
                if category
                else None
            )

    async def create_default_category(
        self, project_id: UUID
    ) -> internal_db_models.EvaluationCategoryRead:
        """Create a default evaluation category for a project."""
        default_category = internal_db_models.EvaluationCategoryCreate(
            id=uuid4(),
            name="default",
            description="Default evaluation category",
            project_id=project_id,
        )
        return await self.create(default_category)

    async def ensure_default_category_exists(
        self, project_id: UUID
    ) -> internal_db_models.EvaluationCategoryRead:
        """Ensure a default category exists for the project, create if it doesn't."""
        existing_default = await self.get_by_name_and_project("default", project_id)
        if existing_default:
            return existing_default
        return await self.create_default_category(project_id)

    async def find_or_create_by_name(
        self, name: str, project_id: UUID, description: str | None = None
    ) -> internal_db_models.EvaluationCategoryRead:
        """Find an existing category by name or create a new one."""
        existing_category = await self.get_by_name_and_project(name, project_id)
        if existing_category:
            return existing_category

        new_category = internal_db_models.EvaluationCategoryCreate(
            id=uuid4(),
            name=name,
            description=description or f"Category: {name}",
            project_id=project_id,
        )
        return await self.add(new_category)
