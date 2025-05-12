import logging
import mimetypes
import os
import tempfile
import uuid
from uuid import UUID

import aioboto3
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel
from temporalio import activity
from vmxai import VMXClient
from vmxai.types import (
    BatchRequestCallbackOptions,
    CompletionBatchItemUpdateCallbackPayload,
    CompletionBatchRequestStatus,
    CompletionRequest,
    RequestMessage,
)

from ingestion_workflow import models
from ingestion_workflow.schema.s3 import S3Event

logger = logging.getLogger(__name__)


class LoadS3FileOutput(BaseModel):
    file: models.FileRead
    docs: list[Document]


@activity.defn
async def load_s3_file(s3_event: S3Event) -> LoadS3FileOutput:
    from .containers import Container

    project_repository = Container.project_repository()
    file_repository = Container.file_repository()

    async with aioboto3.Session().client("s3") as s3:
        for record in s3_event.records:
            logger.info(
                f"Processing record s3://{record.s3.bucket.name}/{record.s3.object.key}"
            )
            project_id, file_name = record.s3.object.key.split("/")
            if not project_id:
                raise ValueError("Project ID not found in S3 key")

            project = await project_repository.get(UUID(project_id))
            if not project:
                raise ValueError(f"Project {project_id} not found")

            _, file_ext = os.path.splitext(file_name)

            with tempfile.NamedTemporaryFile(suffix=file_ext) as temp_file:
                logger.info(
                    f"Downloading s3://{record.s3.bucket.name}/{record.s3.object.key}"
                    f"to {temp_file.name}"
                )
                await s3.download_file(
                    Bucket=record.s3.bucket.name,
                    Key=record.s3.object.key,
                    Filename=temp_file.name,
                )

                file = await file_repository.add(
                    models.FileCreate(
                        id=uuid.uuid4(),
                        name=file_name,
                        type=mimetypes.guess_type(file_name)[0],
                        project_id=project.id,
                        size=record.s3.object.size,
                        status=models.FileStatus.CHUNKING,
                        url=f"s3://{record.s3.bucket.name}/{record.s3.object.key}",
                        error=None,
                    )
                )

                match file_ext:
                    case ".pdf":
                        loader = PyPDFLoader(temp_file.name)
                        docs = await loader.aload()
                        logger.info(f"Loaded {len(docs)} documents")
                        return LoadS3FileOutput(
                            file=file,
                            docs=docs,
                        )
                    case _:
                        raise ValueError(f"Unsupported file extension: {file_ext}")


@activity.defn
async def chunk_document(file: models.FileRead, document: Document) -> list[Document]:
    from .containers import Container

    file_repository = Container.file_repository()

    logger.info(f"Chunking document length: {len(document.page_content)}")
    text_splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
        encoding_name="cl100k_base", chunk_size=100, chunk_overlap=20
    )

    result = text_splitter.split_documents([document])
    logger.info(f"Split {len(result)} chunks")

    await file_repository.update(file.id, {"status": models.FileStatus.CHUNKED})

    return result


@activity.defn
async def create_chunk_embeddings(
    file: models.FileRead, chunk_number: int, chunk: Document
) -> None:
    from .containers import Container

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
            content=chunk.page_content,
            embedding=embedding[0],
        )
    )
    logger.info(f"Added embedding for chunk {chunk_number} to database")

    await file_repository.update(file.id, {"status": models.FileStatus.EMBEDDED})


@activity.defn
async def start_evaluations(file: models.FileRead, docs: list[Document]):
    from .containers import Container

    workflow_id = activity.info().workflow_id
    question_repository = Container.question_repository()
    file_repository = Container.file_repository()
    settings = Container.settings()

    await file_repository.update(file.id, {"status": models.FileStatus.EVALUATING})

    logger.info(f"Starting evaluations for file {file.id}")
    logger.info(f"Getting questions for project {file.project_id}")
    project_questions = await question_repository.get_by_project_id(
        project_id=file.project_id
    )
    logger.info(
        f"Found {len(project_questions)} questions for project {file.project_id}"
    )

    requests: list[CompletionRequest] = []

    for doc in docs:
        for question in project_questions:
            messages: list[RequestMessage] = []

            if question.system_prompt:
                messages.append(
                    RequestMessage(
                        role="system",
                        content=question.system_prompt,
                    )
                )

            messages.append(
                RequestMessage(
                    role="system",
                    content=(
                        f"Document Page: {doc.page_content}\n\nMetadata: {doc.metadata}"
                    ),
                )
            )

            messages.append(
                RequestMessage(
                    role="user",
                    content=question.question,
                )
            )

            requests.append(
                CompletionRequest(
                    messages=messages,
                    resource="default",
                    metadata={
                        "question_id": str(question.id),
                        "file_id": str(file.id),
                        "page_metadata": doc.metadata,
                        "workflow_id": workflow_id,
                    },
                )
            )

    if file.type != "application/pdf":
        raise ValueError("Only PDF files are supported for evaluation")

    vmx = VMXClient(
        domain=settings.vmx.domain,
        api_key=settings.vmx.api_key,
        workspace_id=settings.vmx.workspace_id,
        environment_id=settings.vmx.environment_id,
    )

    callback_url = f"http://localhost:8000/ingestion-callback/{workflow_id}"

    return await vmx.completion_batch_callback(
        requests=requests,
        callback_options=BatchRequestCallbackOptions(
            headers={},
            url=callback_url,
            events=["ITEM_UPDATE"],
        ),
    )


@activity.defn
async def store_evaluation(
    file: models.FileRead, result: CompletionBatchItemUpdateCallbackPayload
):
    from .containers import Container

    file_question_repository = Container.file_question_repository()
    await file_question_repository.add(
        models.FileQuestionCreate(
            id=uuid.uuid4(),
            file_id=file.id,
            question_id=UUID(result.payload.request.metadata["question_id"]),
            answer=result.payload.response.message,
            context_metadata=result.payload.request.metadata["page_metadata"],
            status=models.FileQuestionStatus.COMPLETED
            if result.payload.status == CompletionBatchRequestStatus.COMPLETED
            else models.FileQuestionStatus.FAILED,
            error=result.payload.error,
        )
    )


@activity.defn
async def update_file_status(file: models.FileRead, status: models.FileStatus):
    from .containers import Container

    file_repository = Container.file_repository()
    await file_repository.update(file.id, {"status": status})
