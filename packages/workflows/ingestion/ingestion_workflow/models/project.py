from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel


class ProjectBase(SQLModel):
    name: str = Field(sa_type=Text, nullable=False)
    description: str = Field(sa_type=Text, nullable=False)


class Project(ProjectBase, table=True):
    __tablename__ = "projects"

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


class ProjectCreate(ProjectBase):
    id: UUID


class ProjectRead(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class ProjectReadWithStats(ProjectRead):
    total_files_count: int
    pending_files_count: int
    completed_files_count: int
    failed_files_count: int
    total_size: float | None
    total_evaluations: int


class ProjectEvaluationBase(SQLModel):
    evaluation_id: UUID = Field(foreign_key="evaluations.id", primary_key=True)
    project_id: UUID = Field(foreign_key="projects.id", primary_key=True)


class ProjectEvaluation(ProjectEvaluationBase, table=True):
    __tablename__ = "project_evaluations"

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


class ProjectEvaluationCreate(ProjectEvaluationBase): ...


class ProjectEvaluationRead(ProjectEvaluationBase):
    created_at: datetime
    updated_at: datetime
