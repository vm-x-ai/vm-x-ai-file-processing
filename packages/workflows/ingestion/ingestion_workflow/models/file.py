from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel


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


class FileCreate(FileBase):
    id: UUID


class FileRead(FileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class FileQuestionStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileQuestionBase(SQLModel):
    file_id: UUID = Field(foreign_key="files.id")
    question_id: UUID = Field(foreign_key="questions.id")
    answer: str = Field(sa_type=Text, nullable=False)
    context_metadata: dict = Field(sa_type=postgresql.JSONB, nullable=False)
    status: FileQuestionStatus = Field(default=FileQuestionStatus.PENDING)
    error: str | None = Field(default=None, sa_type=Text)


class FileQuestion(FileQuestionBase, table=True):
    __tablename__ = "file_questions"

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


class FileQuestionCreate(FileQuestionBase):
    id: UUID


class FileQuestionRead(FileQuestionBase):
    created_at: datetime
    updated_at: datetime
