from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

import vmxfp_db_models
from sqlalchemy import Column, ColumnExpressionArgument, distinct, func, select
from sqlalchemy.engine.result import TupleResult
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from .base import BaseRepository


class ProjectRepository(
    BaseRepository[
        UUID,
        vmxfp_db_models.Project,
        vmxfp_db_models.ProjectRead,
        vmxfp_db_models.ProjectCreate,
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
            vmxfp_db_models.Project,
            vmxfp_db_models.ProjectRead,
            vmxfp_db_models.ProjectCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], vmxfp_db_models.File.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(vmxfp_db_models.Project.id) == id

    async def get_all_with_stats(
        self,
    ) -> list[vmxfp_db_models.ProjectReadWithStats]:
        async with self._session_factory() as session:
            total_files_count = func.count(distinct(vmxfp_db_models.File.id)).label(
                "total_files_count"
            )
            pending_files_count = (
                func.count(distinct(vmxfp_db_models.File.id))
                .filter(
                    vmxfp_db_models.File.status == vmxfp_db_models.FileStatus.PENDING
                )
                .label("pending_files_count")
            )
            completed_files_count = (
                func.count(distinct(vmxfp_db_models.File.id))
                .filter(
                    vmxfp_db_models.File.status == vmxfp_db_models.FileStatus.COMPLETED
                )
                .label("completed_files_count")
            )
            failed_files_count = (
                func.count(distinct(vmxfp_db_models.File.id))
                .filter(
                    vmxfp_db_models.File.status == vmxfp_db_models.FileStatus.FAILED
                )
                .label("failed_files_count")
            )
            total_size = func.coalesce(
                (
                    select(func.sum(vmxfp_db_models.File.size))
                    .select_from(vmxfp_db_models.File)
                    .correlate(vmxfp_db_models.Project)
                    .where(
                        vmxfp_db_models.File.project_id == vmxfp_db_models.Project.id
                    )
                    .scalar_subquery()
                ),
                0,
            ).label("total_size")
            total_evaluations = func.count(vmxfp_db_models.FileEvaluation.id).label(
                "total_evaluations"
            )

            query = (
                select(
                    vmxfp_db_models.Project,
                    total_files_count,
                    pending_files_count,
                    completed_files_count,
                    failed_files_count,
                    total_size,
                    total_evaluations,
                )
                .select_from(vmxfp_db_models.Project)
                .join(vmxfp_db_models.File, isouter=True)
                .join(vmxfp_db_models.FileEvaluation, isouter=True)
                .order_by(col(vmxfp_db_models.Project.created_at).desc())
                .group_by(vmxfp_db_models.Project)
            )

            result: TupleResult[
                tuple[
                    vmxfp_db_models.Project,
                    int,
                    int,
                    int,
                    int,
                    float | None,
                    int,
                ]
            ] = await session.exec(query)

            return [
                vmxfp_db_models.ProjectReadWithStats.model_validate(
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
