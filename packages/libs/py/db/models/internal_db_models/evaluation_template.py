from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .evaluation import Evaluation
    from .evaluation_category import EvaluationCategory


class EvaluationTemplateBase(SQLModel):
    name: str = Field(sa_type=Text, nullable=False)
    description: str = Field(sa_type=Text, nullable=False)
    project_id: UUID = Field(foreign_key="projects.id")
    system_prompt: Optional[str] = Field(sa_type=Text, nullable=True)
    prompt: str = Field(sa_type=Text, nullable=False)
    category_id: UUID = Field(foreign_key="evaluation_categories.id")
    default: bool = Field(default=False, nullable=False)


class EvaluationTemplate(EvaluationTemplateBase, table=True):
    __tablename__ = "evaluation_templates"

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

    evaluations: list["Evaluation"] = Relationship(back_populates="template")
    category: "EvaluationCategory" = Relationship()


class EvaluationTemplateCreate(EvaluationTemplateBase):
    id: UUID


class EvaluationTemplateRead(EvaluationTemplateBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
