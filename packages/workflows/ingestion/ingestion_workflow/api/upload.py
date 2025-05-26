import logging
import mimetypes
import os
import uuid
from uuid import UUID

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from utils.s3 import generate_upload_url

from ingestion_workflow import models
from ingestion_workflow.containers import Container
from ingestion_workflow.repositories.file import FileRepository
from ingestion_workflow.settings import Settings

logger = logging.getLogger(__name__)
router = APIRouter()


class UploadIntentRequest(BaseModel):
    file_name: str
    file_size: int


class UploadIntentResponse(BaseModel):
    upload_url: str
    headers: dict[str, str]
    file: models.FileRead


@router.post(
    "/projects/{project_id}/upload-intent",
    operation_id="uploadIntent",
    description="Upload an intent for a project",
    response_model=UploadIntentResponse,
    tags=["upload"],
)
@inject
async def upload_intent(
    project_id: UUID,
    request: UploadIntentRequest,
    file_repository: FileRepository = Depends(Provide[Container.file_repository]),
    settings: Settings = Depends(Provide[Container.settings]),
) -> UploadIntentResponse:
    file_id = uuid.uuid4()
    _, file_ext = os.path.splitext(request.file_name)
    s3_path = f"s3://{settings.landing.s3_bucket_name}/{project_id}/{file_id}{file_ext}"

    upload_url, headers = await generate_upload_url(
        s3_path,
        request.file_size,
        Container.aioboto3_session(),
        metadata={
            "file_id": str(file_id),
        },
    )

    file = await file_repository.add(
        models.FileCreate(
            project_id=project_id,
            name=request.file_name,
            type=mimetypes.guess_type(request.file_name)[0]
            or "application/octet-stream",
            size=request.file_size,
            url=s3_path,
            thumbnail_url=None,
            status=models.FileStatus.PENDING,
            error=None,
            id=file_id,
        )
    )

    return UploadIntentResponse(
        upload_url=upload_url,
        headers=headers,
        file=file,
    )
