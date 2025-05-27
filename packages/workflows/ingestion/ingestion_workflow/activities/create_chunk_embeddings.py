import logging
import uuid

from langchain_openai import OpenAIEmbeddings
from temporalio import activity

from ingestion_workflow import models
from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


@activity.defn
async def create_chunk_embeddings(
    file_id: uuid.UUID,
    chunk_id: uuid.UUID,
    chunk_number: int,
) -> None:
    file_embedding_repository = Container.file_embedding_repository()
    file_repository = Container.file_repository()
    settings = Container.settings()

    await file_repository.update(file_id, {"status": models.FileStatus.EMBEDDING})

    logger.info(f"Creating embeddings for chunk {chunk_number}")
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small", api_key=settings.openai.api_key
    )

    file_embedding = await file_embedding_repository.get(chunk_id)
    if file_embedding is None:
        raise ValueError(f"File embedding not found for chunk {chunk_number}")

    logger.info(f"Embedding chunk {chunk_number}")
    embedding = await embeddings.aembed_documents([file_embedding.content])
    logger.info(f"Embedding chunk {chunk_number} done")

    logger.info(f"Upading embedding for chunk {chunk_number} to database")
    await file_embedding_repository.update(
        chunk_id,
        {
            "chunk_number": chunk_number,
            "embedding": embedding[0],
            "status": models.FileEmbeddingStatus.EMBEDDED,
        },
    )

    logger.info(f"Updated embedding for chunk {chunk_number} to database")

    await file_repository.update(file_id, {"status": models.FileStatus.EMBEDDED})
