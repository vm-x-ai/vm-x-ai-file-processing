from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, distinct, func, select
from sqlalchemy.engine.result import TupleResult
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

    async def get_all_with_stats(self) -> list[models.ProjectReadWithStats]:
        async with self._session_factory() as session:
            total_files_count = func.count(distinct(models.File.id)).label(
                "total_files_count"
            )
            pending_files_count = (
                func.count(distinct(models.File.id))
                .filter(models.File.status == models.FileStatus.PENDING)
                .label("pending_files_count")
            )
            completed_files_count = (
                func.count(distinct(models.File.id))
                .filter(models.File.status == models.FileStatus.COMPLETED)
                .label("completed_files_count")
            )
            failed_files_count = (
                func.count(distinct(models.File.id))
                .filter(models.File.status == models.FileStatus.FAILED)
                .label("failed_files_count")
            )
            total_size = func.coalesce(
                (
                    select(func.sum(models.File.size))
                    .select_from(models.File)
                    .correlate(models.Project)
                    .where(models.File.project_id == models.Project.id)
                    .scalar_subquery()
                ),
                0,
            ).label("total_size")
            total_evaluations = func.count(models.FileEvaluation.id).label(
                "total_evaluations"
            )

            query = (
                select(
                    models.Project,
                    total_files_count,
                    pending_files_count,
                    completed_files_count,
                    failed_files_count,
                    total_size,
                    total_evaluations,
                )
                .select_from(models.Project)
                .join(models.File, isouter=True)
                .join(models.FileEvaluation, isouter=True)
                .order_by(col(models.Project.created_at).desc())
                .group_by(models.Project)
            )

            result: TupleResult[
                tuple[models.Project, int, int, int, int, float | None, int]
            ] = await session.exec(query)

            return [
                models.ProjectReadWithStats.model_validate(
                    {
                        **project.model_dump(),
                        "total_files_count": total_files_count,
                        "pending_files_count": pending_files_count,
                        "completed_files_count": completed_files_count,
                        "failed_files_count": failed_files_count,
                        "total_size": total_size,
                        "total_evaluations": total_evaluations,
                    }
                )
                for (
                    project,
                    total_files_count,
                    pending_files_count,
                    completed_files_count,
                    failed_files_count,
                    total_size,
                    total_evaluations,
                ) in result.all()
            ]
