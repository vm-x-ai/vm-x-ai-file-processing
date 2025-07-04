from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel

from .file_embedding import FileEmbeddingRead


class FileContentBase(SQLModel):
    file_id: UUID = Field(foreign_key="files.id", ondelete="CASCADE")
    content_number: int = Field(nullable=False)
    content_metadata: dict = Field(sa_type=postgresql.JSONB, nullable=False)
    content: str = Field(sa_type=Text, nullable=False)


class FileContent(FileContentBase, table=True):
    __tablename__ = "file_contents"
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


class FileContentCreate(FileContentBase):
    id: UUID


class FileContentRead(FileContentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


class FileContentReadWithChunkScore(FileContentRead):
    match_chunks: list[FileEmbeddingRead] | None = None
    before_neighbors: list["FileContentRead"] | None = None
    after_neighbors: list["FileContentRead"] | None = None
