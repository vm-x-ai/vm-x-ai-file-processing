from datetime import datetime
from typing import Any
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Index, Text, func
from sqlalchemy.dialects import postgresql
from sqlmodel import Field, SQLModel


class FileEmbeddingBase(SQLModel):
    file_id: UUID = Field(foreign_key="files.id")
    chunk_number: int = Field(nullable=False)
    chunk_metadata: dict = Field(sa_type=postgresql.JSONB, nullable=False)
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
    created_at: datetime
    updated_at: datetime
