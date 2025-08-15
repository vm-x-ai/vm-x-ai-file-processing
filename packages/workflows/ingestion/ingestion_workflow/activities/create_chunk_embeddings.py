import logging
import uuid

import internal_db_models
from internal_db_repositories.file import FileRepository
from internal_db_repositories.file_embedding import FileEmbeddingRepository
from langchain_openai import OpenAIEmbeddings

logger = logging.getLogger(__name__)


class CreateChunkEmbeddingsActivity:
    def __init__(
        self,
        file_embedding_repository: FileEmbeddingRepository,
        file_repository: FileRepository,
        openai_api_key: str,
    ):
        self._file_embedding_repository = file_embedding_repository
        self._file_repository = file_repository
        self._openai_api_key = openai_api_key

    async def run(
        self,
        file_id: uuid.UUID,
        chunk_id: uuid.UUID,
        chunk_number: int,
    ) -> None:
        await self._file_repository.update(
            file_id, {"status": internal_db_models.FileStatus.EMBEDDING}
        )

        logger.info(f"Creating embeddings for chunk {chunk_number}")
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small", api_key=self._openai_api_key
        )

        file_embedding = await self._file_embedding_repository.get(chunk_id)
        if file_embedding is None:
            raise ValueError(f"File embedding not found for chunk {chunk_number}")

        logger.info(f"Embedding chunk {chunk_number}")
        embedding = await embeddings.aembed_documents([file_embedding.content])
        logger.info(f"Embedding chunk {chunk_number} done")

        logger.info(f"Upading embedding for chunk {chunk_number} to database")
        await self._file_embedding_repository.update(
            chunk_id,
            {
                "chunk_number": chunk_number,
                "embedding": embedding[0],
                "status": internal_db_models.FileEmbeddingStatus.EMBEDDED,
            },
        )

        logger.info(f"Updated embedding for chunk {chunk_number} to database")

        await self._file_repository.update(
            file_id, {"status": internal_db_models.FileStatus.EMBEDDED}
        )
