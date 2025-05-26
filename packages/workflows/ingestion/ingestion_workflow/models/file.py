from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, Relationship, SQLModel

from ingestion_workflow.models.evaluation import Evaluation, EvaluationRead
from ingestion_workflow.models.file_content import FileContent, FileContentRead


class FileStatus(str, Enum):
    PENDING = "pending"
    CHUNKING = "chunking"
    CHUNKED = "chunked"
    EMBEDDING = "embedding"
    EMBEDDED = "embedded"
    EVALUATING = "evaluating"
    EVALUATED = "evaluated"
    COMPLETED = "completed"
    FAILED = "failed"


class FileBase(SQLModel):
    name: str = Field(sa_type=Text, nullable=False)
    type: str = Field(sa_type=Text, nullable=False)
    size: int
    url: str = Field(sa_type=Text, nullable=False)
    status: FileStatus = Field(default=FileStatus.PENDING)
    error: str | None = Field(default=None, sa_type=Text)
    project_id: UUID = Field(foreign_key="projects.id")
    thumbnail_url: str | None = Field(default=None, sa_type=Text)


class File(FileBase, table=True):
    __tablename__ = "files"

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

    evaluations: list["FileEvaluation"] = Relationship(back_populates="file")


class FileCreate(FileBase):
    id: UUID


class FileRead(FileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class FileReadWithEvaluations(FileRead):
    evaluations: list["FileEvaluationReadWithEvaluation"]


class FileEvaluationStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileEvaluationBase(SQLModel):
    file_id: UUID = Field(foreign_key="files.id", ondelete="CASCADE")
    evaluation_id: UUID = Field(foreign_key="evaluations.id", ondelete="CASCADE")
    content_id: UUID = Field(foreign_key="file_contents.id", ondelete="CASCADE")
    response: str = Field(sa_type=Text, nullable=False)
    status: FileEvaluationStatus = Field(default=FileEvaluationStatus.PENDING)
    error: str | None = Field(default=None, sa_type=Text)


class FileEvaluation(FileEvaluationBase, table=True):
    __tablename__ = "file_evaluations"

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

    file: File = Relationship(back_populates="evaluations")
    evaluation: Evaluation = Relationship(back_populates="file_evaluations")
    content: FileContent = Relationship()


class FileEvaluationCreate(FileEvaluationBase):
    id: UUID


class FileEvaluationRead(FileEvaluationBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class FileEvaluationReadWithFile(FileEvaluationRead):
    file: FileRead
    evaluation: EvaluationRead
    content: FileContentRead


class FileEvaluationReadWithEvaluation(FileEvaluationRead):
    evaluation: EvaluationRead
    content: FileContentRead
