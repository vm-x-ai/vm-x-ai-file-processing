from contextlib import AbstractAsyncContextManager
from typing import Callable, cast
from uuid import UUID

from sqlalchemy import Column, ColumnExpressionArgument, select
from sqlmodel import col
from sqlmodel.ext.asyncio.session import AsyncSession

from ingestion_workflow import models
from ingestion_workflow.repositories.base import BaseRepository


class QuestionRepository(
    BaseRepository[UUID, models.Question, models.QuestionRead, models.QuestionCreate]
):
    def __init__(
        self,
        session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
        write_session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
    ):
        super().__init__(
            session_factory,
            write_session_factory,
            models.Question,
            models.QuestionRead,
            models.QuestionCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], models.Question.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(models.Question.id) == id

    async def get_by_project_id(self, project_id: UUID) -> list[models.QuestionRead]:
        async with self._session_factory() as session:
            query = select(models.Question).where(
                models.Question.project_id == project_id
            )

            result = await session.scalars(query)

            return [
                models.QuestionRead.model_validate(question)
                for question in result.all()
            ]
