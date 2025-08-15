from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship, SQLModel

from internal_db_models.evaluation import Evaluation, EvaluationRead


class EvaluationCategoryBase(SQLModel):
    name: str = Field(sa_type=Text, nullable=False)
    description: str | None = Field(sa_type=Text, nullable=True)
    project_id: UUID = Field(foreign_key="projects.id", ondelete="CASCADE")


class EvaluationCategory(EvaluationCategoryBase, table=True):
    __tablename__ = "evaluation_categories"

    id: UUID | None = Field(primary_key=True)

    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
    )

    updated_at: datetime | None = Field(
        default=None,
        sa_column=Column(
            postgresql.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )

    evaluations: list["Evaluation"] = Relationship(
        back_populates="category",
    )


class EvaluationCategoryCreate(EvaluationCategoryBase):
    id: UUID


class EvaluationCategoryRead(EvaluationCategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class EvaluationCategoryWithEvaluations(EvaluationCategoryRead):
    evaluations: list[EvaluationRead]
