from contextlib import AbstractAsyncContextManager
from typing import Callable, Literal, cast
from uuid import UUID

import dm_db_models
from pydantic import BaseModel
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

from .base import BaseRepository


class FileSearchEvaluation(BaseModel):
    evaluation_id: UUID
    response_value: str | None = None


class FileSearchEvaluationOperation(BaseModel):
    operation: Literal["eq", "neq"]
    value: FileSearchEvaluation


class FileSearchEvaluationGroup(BaseModel):
    operation: Literal["and", "or"]
    evaluations: list["FileSearchEvaluationOperation | FileSearchEvaluationGroup"]


class FileSearchRequest(BaseModel):
    search_query: str | None = None
    evaluations: FileSearchEvaluationGroup | None = None


class FileRepository(
    BaseRepository[
        UUID, dm_db_models.File, dm_db_models.FileRead, dm_db_models.FileCreate
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
            dm_db_models.File,
            dm_db_models.FileRead,
            dm_db_models.FileCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], dm_db_models.File.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(dm_db_models.File.id) == id

    async def get_by_project_id(
        self,
        project_id: UUID,
    ) -> list[dm_db_models.FileRead]:
        async with self._session_factory() as session:
            query = (
                select(dm_db_models.File)
                .where(dm_db_models.File.project_id == project_id)
                .order_by(col(dm_db_models.File.created_at).desc())
            )
            result = await session.scalars(query)
            return [dm_db_models.FileRead.model_validate(file) for file in result.all()]

    async def search_files(
        self,
        project_id: UUID,
        request: FileSearchRequest,
    ) -> list[dm_db_models.FileReadWithEvaluations]:
        async with self._session_factory() as session:
            query = (
                select(
                    dm_db_models.File,
                    dm_db_models.FileEvaluation,
                    dm_db_models.Evaluation,
                    dm_db_models.FileContent,
                )
                .select_from(dm_db_models.File)
                .join(dm_db_models.FileEvaluation)
                .join(
                    dm_db_models.Evaluation,
                    dm_db_models.FileEvaluation.evaluation_id
                    == dm_db_models.Evaluation.id,
                )
                .join(
                    dm_db_models.FileContent,
                    dm_db_models.FileEvaluation.content_id
                    == dm_db_models.FileContent.id,
                )
                .where(dm_db_models.File.project_id == project_id)
                .order_by(col(dm_db_models.File.created_at).desc())
            )

            if request.search_query:
                query = query.where(
                    dm_db_models.File.name.ilike(f"%{request.search_query}%"),
                )

            if request.evaluations:
                query = query.where(
                    self._build_evaluations_group_query(request.evaluations)
                )

            result: TupleResult[
                tuple[
                    dm_db_models.File,
                    dm_db_models.FileEvaluation,
                    dm_db_models.Evaluation,
                    dm_db_models.FileContent,
                ]
            ] = await session.exec(query)

            files: list[dm_db_models.FileReadWithEvaluations] = []
            file_map: dict[UUID, dm_db_models.FileReadWithEvaluations] = {}
            for file, file_evaluation, evaluation, content in result.all():
                if file.id not in file_map:
                    file_map[file.id] = dm_db_models.FileReadWithEvaluations(
                        **file.model_dump(),
                        evaluations=[],
                    )
                    files.append(file_map[file.id])

                file_map[file.id].evaluations.append(
                    dm_db_models.FileEvaluationReadWithEvaluation(
                        **file_evaluation.model_dump(),
                        evaluation=dm_db_models.EvaluationRead.model_validate(
                            evaluation.model_dump()
                        ),
                        content=dm_db_models.FileContentRead.model_validate(
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
                    .select_from(dm_db_models.FileEvaluation)
                    .where(
                        and_(
                            dm_db_models.FileEvaluation.file_id == dm_db_models.File.id,
                            condition,
                        )
                    )
                    .correlate(dm_db_models.File)
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
                            col(dm_db_models.FileEvaluation.evaluation_id)
                            == evaluation.value.evaluation_id,
                            col(dm_db_models.FileEvaluation.response)
                            == evaluation.value.response_value,
                        )
                    )
                    if evaluation.value.response_value
                    else (
                        col(dm_db_models.FileEvaluation.evaluation_id)
                        == evaluation.value.evaluation_id
                    )
                ).self_group()
            case "neq":
                return (
                    (
                        and_(
                            col(dm_db_models.FileEvaluation.evaluation_id)
                            == evaluation.value.evaluation_id,
                            col(dm_db_models.FileEvaluation.response)
                            == evaluation.value.response_value,
                        )
                    )
                    if evaluation.value.response_value
                    else (
                        col(dm_db_models.FileEvaluation.evaluation_id)
                        == evaluation.value.evaluation_id
                    )
                ).self_group()
