from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel


class QuestionBase(SQLModel):
    title: str = Field(sa_type=Text, nullable=False)
    description: str = Field(sa_type=Text, nullable=False)
    system_prompt: Optional[str] = Field(sa_type=Text, nullable=True)
    question: str = Field(sa_type=Text, nullable=False)
    project_id: UUID = Field(foreign_key="projects.id")


class Question(QuestionBase, table=True):
    __tablename__ = "questions"

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


class QuestionCreate(QuestionBase):
    id: UUID


class QuestionRead(QuestionBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
