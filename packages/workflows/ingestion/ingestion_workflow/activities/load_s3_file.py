import logging
import mimetypes
import os
import tempfile
import uuid
from io import BytesIO
from uuid import UUID

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from pdf2image import convert_from_path
from pydantic import BaseModel
from temporalio import activity

from ingestion_workflow import models
from ingestion_workflow.containers import Container
from ingestion_workflow.schema.s3 import S3Event

logger = logging.getLogger(__name__)

THUMBNAIL_SIZE = (1280, 1280)


class LoadS3FileOutput(BaseModel):
    file: models.FileRead
    docs: list[tuple[models.FileContentRead, Document]]


@activity.defn
async def load_s3_file(
    s3_event: S3Event,
) -> LoadS3FileOutput:
    file_repository = Container.file_repository()
    project_repository = Container.project_repository()
    file_content_repository = Container.file_content_repository()
    aioboto3_session = Container.aioboto3_session()

    async with aioboto3_session.client("s3") as s3:
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

                head_object = await s3.head_object(
                    Bucket=record.s3.bucket.name, Key=record.s3.object.key
                )

                object_metadata = head_object.get("Metadata", {})
                file_id = object_metadata.get("file_id", None)
                if not file_id:
                    file_id = uuid.uuid4()
                    file = await file_repository.add(
                        models.FileCreate(
                            id=file_id,
                            name=file_name,
                            type=mimetypes.guess_type(file_name)[0],
                            project_id=project.id,
                            size=record.s3.object.size,
                            status=models.FileStatus.CHUNKING,
                            url=f"s3://{record.s3.bucket.name}/{record.s3.object.key}",
                            thumbnail_url=None,
                            error=None,
                        )
                    )
                else:
                    file = await file_repository.get(UUID(file_id))
                    if not file:
                        raise ValueError(f"File {file_id} not found")

                match file_ext:
                    case ".pdf":
                        await _generate_pdf_thumbnail(
                            project,
                            temp_file,
                            file,
                        )

                        loader = PyPDFLoader(temp_file.name)
                        docs = await loader.aload()
                        contents = await file_content_repository.add_all(
                            [
                                models.FileContentCreate(
                                    id=uuid.uuid4(),
                                    file_id=file.id,
                                    content_number=idx + 1,
                                    content=doc.page_content,
                                    content_metadata=doc.metadata,
                                )
                                for idx, doc in enumerate(docs)
                            ],
                            return_models=True,
                        )

                        logger.info(f"Loaded {len(docs)} documents")
                        return LoadS3FileOutput(
                            file=file,
                            docs=list(zip(contents, docs)),
                        )
                    case _:
                        raise ValueError(f"Unsupported file extension: {file_ext}")


async def _generate_pdf_thumbnail(
    project: models.ProjectRead,
    temp_file: tempfile.NamedTemporaryFile,
    file: models.FileRead,
):
    file_repository = Container.file_repository()
    settings = Container.settings()
    aioboto3_session = Container.aioboto3_session()

    images = convert_from_path(
        temp_file.name,
        first_page=1,
        last_page=1,
    )
    img = images[0]
    img.thumbnail(THUMBNAIL_SIZE)
    thumbnail_bytes = BytesIO()
    img.save(thumbnail_bytes, format="PNG")
    thumbnail_bytes.seek(0)

    thumbnail_key = f"{project.id}/{file.id}/thumbnail.png"
    thumbnail_url = f"s3://{settings.thumbnail.s3_bucket_name}/{thumbnail_key}"

    async with aioboto3_session.client("s3") as s3:
        await s3.upload_fileobj(
            thumbnail_bytes,
            Bucket=settings.thumbnail.s3_bucket_name,
            Key=thumbnail_key,
            ExtraArgs={
                "ContentType": "image/png",
            },
        )

    await file_repository.update(
        file.id,
        {
            "thumbnail_url": thumbnail_url,
        },
    )
