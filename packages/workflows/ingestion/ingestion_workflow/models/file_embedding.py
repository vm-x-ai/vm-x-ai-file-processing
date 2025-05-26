from datetime import datetime
from typing import Any
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Index, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel


class FileEmbeddingBase(SQLModel):
    file_id: UUID = Field(foreign_key="files.id", ondelete="CASCADE")
    chunk_number: int = Field(nullable=False)
    chunk_metadata: dict = Field(sa_type=postgresql.JSONB, nullable=False)
    project_id: UUID = Field(foreign_key="projects.id", ondelete="CASCADE")
    content_id: UUID = Field(foreign_key="file_contents.id", ondelete="CASCADE")
    content: str = Field(sa_type=Text, nullable=False)
    embedding: Any = Field(sa_type=Vector(dim=1536), nullable=False)


class FileEmbedding(FileEmbeddingBase, table=True):
    __tablename__ = "file_embeddings"
    __table_args__ = (
        Index(
            "ix_file_embeddings_vector",
            "embedding",
            postgresql_using="hnsw",
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

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


class FileEmbeddingCreate(FileEmbeddingBase):
    id: UUID


class FileEmbeddingRead(FileEmbeddingBase):
    id: UUID
    score: float | None = None
    before_neighbors: list["FileEmbeddingRead"] | None = None
    after_neighbors: list["FileEmbeddingRead"] | None = None
    created_at: datetime
    updated_at: datetime

    def __init__(self, **data: Any):
        super().__init__(**data)
        delattr(self, "embedding")
