import logging

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from temporalio import activity

from ingestion_workflow import models
from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


@activity.defn
async def chunk_document(file: models.FileRead, document: Document) -> list[Document]:
    file_repository = Container.file_repository()
    file_repository = Container.file_repository()

    logger.info(f"Chunking document length: {len(document.page_content)}")
    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        encoding_name="cl100k_base", chunk_size=100, chunk_overlap=20
    )

    result = text_splitter.split_documents([document])
    logger.info(f"Split {len(result)} chunks")

    await file_repository.update(file.id, {"status": models.FileStatus.CHUNKED})

    return result
