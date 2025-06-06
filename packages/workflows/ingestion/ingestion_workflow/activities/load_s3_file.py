import logging
import mimetypes
import os
import tempfile
import uuid
from io import BytesIO
from uuid import UUID

import aioboto3
import dm_db_models
from dm_db_repositories.file import FileRepository
from dm_db_repositories.file_content import FileContentRepository
from dm_db_repositories.project import ProjectRepository
from dm_schemas.s3 import S3Event
from langchain_community.document_loaders import PyPDFLoader
from pdf2image import convert_from_path
from pydantic import BaseModel
from temporalio import activity

logger = logging.getLogger(__name__)

THUMBNAIL_SIZE = (1280, 1280)


class LoadS3FileOutput(BaseModel):
    file_id: UUID
    project_id: UUID
    file_content_ids: list[UUID]


class LoadS3FileActivity:
    def __init__(
        self,
        file_repository: FileRepository,
        project_repository: ProjectRepository,
        file_content_repository: FileContentRepository,
        aioboto3_session: aioboto3.Session,
        thumbnail_s3_bucket_name: str,
    ):
        self._file_repository = file_repository
        self._project_repository = project_repository
        self._file_content_repository = file_content_repository
        self._aioboto3_session = aioboto3_session
        self._thumbnail_s3_bucket_name = thumbnail_s3_bucket_name

    @activity.defn(name="LoadS3FileActivity")
    async def run(
        self,
        s3_event: S3Event,
    ) -> LoadS3FileOutput:
        async with self._aioboto3_session.client("s3") as s3:
            for record in s3_event.records:
                logger.info(
                    f"Processing record s3://{record.s3.bucket.name}/{record.s3.object.key}"
                )
                project_id, file_name = record.s3.object.key.split("/")
                if not project_id:
                    raise ValueError("Project ID not found in S3 key")

                project = await self._project_repository.get(UUID(project_id))
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
                        file = await self._file_repository.add(
                            dm_db_models.FileCreate(
                                id=file_id,
                                name=file_name,
                                type=mimetypes.guess_type(file_name)[0],
                                project_id=project.id,
                                size=record.s3.object.size,
                                status=dm_db_models.FileStatus.CHUNKING,
                                url=f"s3://{record.s3.bucket.name}/{record.s3.object.key}",
                                thumbnail_url=None,
                                error=None,
                            )
                        )
                    else:
                        file = await self._file_repository.get(UUID(file_id))
                        if not file:
                            raise ValueError(f"File {file_id} not found")

                    match file_ext:
                        case ".pdf":
                            await self._generate_pdf_thumbnail(
                                project,
                                temp_file,
                                file,
                            )

                            loader = PyPDFLoader(temp_file.name)
                            docs = await loader.aload()
                            contents = await self._file_content_repository.add_all(
                                [
                                    dm_db_models.FileContentCreate(
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
                                file_id=file.id,
                                project_id=project.id,
                                file_content_ids=[content.id for content in contents],
                            )
                        case _:
                            raise ValueError(f"Unsupported file extension: {file_ext}")

    async def _generate_pdf_thumbnail(
        self,
        project: dm_db_models.ProjectRead,
        temp_file: tempfile.NamedTemporaryFile,
        file: dm_db_models.FileRead,
    ):
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
        thumbnail_url = f"s3://{self._thumbnail_s3_bucket_name}/{thumbnail_key}"

        async with self._aioboto3_session.client("s3") as s3:
            await s3.upload_fileobj(
                thumbnail_bytes,
                Bucket=self._thumbnail_s3_bucket_name,
                Key=thumbnail_key,
                ExtraArgs={
                    "ContentType": "image/png",
                },
            )

        await self._file_repository.update(
            file.id,
            {
                "thumbnail_url": thumbnail_url,
            },
        )
