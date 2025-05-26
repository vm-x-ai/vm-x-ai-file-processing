from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import (
    Column,
    ColumnExpressionArgument,
    and_,
    exists,
    literal,
    or_,
    select,
)
from sqlalchemy.engine.result import TupleResult
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository
from ingestion_workflow.schema.file import (
    FileSearchEvaluationGroup,
    FileSearchEvaluationOperation,
    FileSearchRequest,
)


class FileRepository(
    BaseRepository[UUID, models.File, models.FileRead, models.FileCreate]
):
    def __init__(
        self,
        session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
        write_session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
    ):
        super().__init__(
            session_factory,
            write_session_factory,
            models.File,
            models.FileRead,
            models.FileCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.File.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.File.id) == id

    async def get_by_project_id(
        self,
        project_id: UUID,
    ) -> list[models.FileRead]:
        async with self._session_factory() as session:
            query = (
                select(models.File)
                .where(models.File.project_id == project_id)
                .order_by(col(models.File.created_at).desc())
            )
            result = await session.scalars(query)
            return [models.FileRead.model_validate(file) for file in result.all()]

    async def search_files(
        self,
        project_id: UUID,
        request: FileSearchRequest,
    ) -> list[models.FileReadWithEvaluations]:
        async with self._session_factory() as session:
            query = (
                select(
                    models.File,
                    models.FileEvaluation,
                    models.Evaluation,
                    models.FileContent,
                )
                .select_from(models.File)
                .join(models.FileEvaluation)
                .join(
                    models.Evaluation,
                    models.FileEvaluation.evaluation_id == models.Evaluation.id,
                )
                .join(
                    models.FileContent,
                    models.FileEvaluation.content_id == models.FileContent.id,
                )
                .where(models.File.project_id == project_id)
                .order_by(col(models.File.created_at).desc())
            )

            if request.search_query:
                query = query.where(
                    models.File.name.ilike(f"%{request.search_query}%"),
                )

            if request.evaluations:
                query = query.where(
                    self._build_evaluations_group_query(request.evaluations)
                )

            result: TupleResult[
                tuple[
                    models.File,
                    models.FileEvaluation,
                    models.Evaluation,
                    models.FileContent,
                ]
            ] = await session.exec(query)

            files: list[models.FileReadWithEvaluations] = []
            file_map: dict[UUID, models.FileReadWithEvaluations] = {}
            for file, file_evaluation, evaluation, content in result.all():
                if file.id not in file_map:
                    file_map[file.id] = models.FileReadWithEvaluations(
                        **file.model_dump(),
                        evaluations=[],
                    )
                    files.append(file_map[file.id])

                file_map[file.id].evaluations.append(
                    models.FileEvaluationReadWithEvaluation(
                        **file_evaluation.model_dump(),
                        evaluation=models.EvaluationRead.model_validate(
                            evaluation.model_dump()
                        ),
                        content=models.FileContentRead.model_validate(
                            content.model_dump()
                        ),
                    )
                )

            return files

    def _build_evaluations_group_query(
        self,
        group: FileSearchEvaluationGroup,
    ) -> ColumnExpressionArgument[bool]:
        clauses = []
        for item in group.evaluations:
            if isinstance(item, FileSearchEvaluationOperation):
                # Build the correlated EXISTS condition
                condition = self._build_evaluation_operation_query(item)
                subquery = (
                    select(literal(1))
                    .select_from(models.FileEvaluation)
                    .where(
                        and_(
                            models.FileEvaluation.file_id == models.File.id,
                            condition,
                        )
                    )
                    .correlate(models.File)
                )
                clauses.append(exists(subquery))

            elif isinstance(item, FileSearchEvaluationGroup):
                # Recursive call for nested group
                nested_clause = self._build_evaluations_group_query(item)
                clauses.append(nested_clause)

        # Combine the conditions using the group's operation
        match group.operation:
            case "and":
                return and_(*clauses).self_group()
            case "or":
                return or_(*clauses).self_group()

    def _build_evaluation_operation_query(
        self,
        evaluation: FileSearchEvaluationOperation,
    ) -> ColumnExpressionArgument[bool]:
        match evaluation.operation:
            case "eq":
                return (
                    (
                        and_(
                            col(models.FileEvaluation.evaluation_id)
                            == evaluation.value.evaluation_id,
                            col(models.FileEvaluation.response)
                            == evaluation.value.response_value,
                        )
                    )
                    if evaluation.value.response_value
                    else (
                        col(models.FileEvaluation.evaluation_id)
                        == evaluation.value.evaluation_id
                    )
                ).self_group()
            case "neq":
                return (
                    (
                        and_(
                            col(models.FileEvaluation.evaluation_id)
                            == evaluation.value.evaluation_id,
                            col(models.FileEvaluation.response)
                            == evaluation.value.response_value,
                        )
                    )
                    if evaluation.value.response_value
                    else (
                        col(models.FileEvaluation.evaluation_id)
                        == evaluation.value.evaluation_id
                    )
                ).self_group()
