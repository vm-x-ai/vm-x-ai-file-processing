from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from ingestion_workflow.models.file import FileEvaluation


class EvaluationType(str, Enum):
    ENUM_CHOICE = "enum_choice"
    TEXT = "text"
    BOOLEAN = "boolean"


class EvaluationBase(SQLModel):
    title: str = Field(sa_type=Text, nullable=False)
    description: str = Field(sa_type=Text, nullable=False)
    system_prompt: Optional[str] = Field(sa_type=Text, nullable=True)
    prompt: str = Field(sa_type=Text, nullable=False)
    project_id: UUID = Field(foreign_key="projects.id")
    evaluation_type: EvaluationType = Field(nullable=False)
    evaluation_options: Optional[list[str]] = Field(
        sa_type=postgresql.JSONB, nullable=True
    )
    parent_evaluation_id: Optional[UUID] = Field(
        foreign_key="evaluations.id", nullable=True
    )
    parent_evaluation_option: Optional[str] = Field(sa_type=Text, nullable=True)


class Evaluation(EvaluationBase, table=True):
    __tablename__ = "evaluations"

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

    file_evaluations: list["FileEvaluation"] = Relationship(back_populates="evaluation")


class EvaluationCreate(EvaluationBase):
    id: UUID


class EvaluationRead(EvaluationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
