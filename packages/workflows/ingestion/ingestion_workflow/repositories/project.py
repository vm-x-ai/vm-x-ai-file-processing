from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class ProjectRepository(
    BaseRepository[UUID, models.Project, models.ProjectRead, models.ProjectCreate]
):
    def __init__(
        self,
        session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
        write_session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
    ):
        super().__init__(
            session_factory,
            write_session_factory,
            models.Project,
            models.ProjectRead,
            models.ProjectCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.File.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.Project.id) == id
