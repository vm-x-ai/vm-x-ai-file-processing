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
    docs: list[Document]


@activity.defn
async def load_s3_file(
    s3_event: S3Event,
) -> LoadS3FileOutput:
    file_repository = Container.file_repository()
    project_repository = Container.project_repository()
    settings = Container.settings()
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

                file_id = uuid.uuid4()

                thumbnail_url = f"s3://{settings.thumbnail.s3_bucket_name}/{project.id}/{file_id}/thumbnail.png"
                file = await file_repository.add(
                    models.FileCreate(
                        id=file_id,
                        name=file_name,
                        type=mimetypes.guess_type(file_name)[0],
                        project_id=project.id,
                        size=record.s3.object.size,
                        status=models.FileStatus.CHUNKING,
                        url=f"s3://{record.s3.bucket.name}/{record.s3.object.key}",
                        thumbnail_url=thumbnail_url,
                        error=None,
                    )
                )

                match file_ext:
                    case ".pdf":
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

                        await s3.upload_fileobj(
                            thumbnail_bytes,
                            Bucket=settings.thumbnail.s3_bucket_name,
                            Key=f"{project.id}/{file.id}/thumbnail.png",
                            ExtraArgs={
                                "ContentType": "image/png",
                            },
                        )

                        loader = PyPDFLoader(temp_file.name)
                        docs = await loader.aload()
                        logger.info(f"Loaded {len(docs)} documents")
                        return LoadS3FileOutput(
                            file=file,
                            docs=docs,
                        )
                    case _:
                        raise ValueError(f"Unsupported file extension: {file_ext}")
