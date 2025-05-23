import logging
import uuid

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from temporalio import activity

from ingestion_workflow import models
from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


@activity.defn
async def create_chunk_embeddings(
    file: models.FileRead,
    chunk_number: int,
    chunk: Document,
    file_content: models.FileContentRead,
) -> None:
    file_embedding_repository = Container.file_embedding_repository()
    file_repository = Container.file_repository()
    settings = Container.settings()

    await file_repository.update(file.id, {"status": models.FileStatus.EMBEDDING})

    logger.info(f"Creating embeddings for chunk {chunk_number}")
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small", api_key=settings.openai.api_key
    )
    logger.info(f"Embedding chunk {chunk_number}")
    embedding = await embeddings.aembed_documents([chunk.page_content])
    logger.info(f"Embedding chunk {chunk_number} done")

    logger.info(f"Adding embedding for chunk {chunk_number} to database")
    await file_embedding_repository.add(
        models.FileEmbeddingCreate(
            id=uuid.uuid4(),
            file_id=file.id,
            chunk_number=chunk_number,
            chunk_metadata=chunk.metadata,
            content_id=file_content.id,
            content=chunk.page_content,
            embedding=embedding[0],
        )
    )
    logger.info(f"Added embedding for chunk {chunk_number} to database")

    await file_repository.update(file.id, {"status": models.FileStatus.EMBEDDED})
