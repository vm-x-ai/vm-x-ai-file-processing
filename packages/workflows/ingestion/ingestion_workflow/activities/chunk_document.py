import logging
import uuid
from uuid import UUID

import dm_db_models
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel
from temporalio import activity

from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


class ChunkDocumentOutput(BaseModel):
    chunk_ids: list[UUID]
    file_content_id: UUID


@activity.defn
async def chunk_document(
    file_id: UUID,
    project_id: UUID,
    file_content_id: UUID,
) -> ChunkDocumentOutput:
    file_repository = Container.file_repository()
    file_content_repository = Container.file_content_repository()
    file_embedding_repository = Container.file_embedding_repository()

    file_content = await file_content_repository.get(file_content_id)
    if not file_content:
        raise ValueError(f"File content {file_content_id} not found")

    logger.info(f"Chunking document length: {len(file_content.content)}")
    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        encoding_name="cl100k_base", chunk_size=100, chunk_overlap=20
    )

    document = Document(
        page_content=file_content.content,
        metadata=file_content.content_metadata,
    )

    result = text_splitter.split_documents([document])
    logger.info(f"Split {len(result)} chunks")

    await file_repository.update(file_id, {"status": dm_db_models.FileStatus.CHUNKED})

    logger.info("Adding chunks to database")
    chunks = await file_embedding_repository.add_all(
        [
            dm_db_models.FileEmbeddingCreate(
                id=uuid.uuid4(),
                file_id=file_id,
                chunk_number=chunk_number + 1,
                chunk_metadata=chunk.metadata,
                content_id=file_content.id,
                content=chunk.page_content,
                project_id=project_id,
                embedding=None,
                status=dm_db_models.FileEmbeddingStatus.CHUNKED,
            )
            for chunk_number, chunk in enumerate(result)
        ],
        return_models=True,
    )
    logger.info("Added chunks to database")

    return ChunkDocumentOutput(
        chunk_ids=[chunk.id for chunk in chunks],
        file_content_id=file_content_id,
    )
