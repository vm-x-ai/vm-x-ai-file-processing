import logging
import mimetypes
import os
import uuid
from uuid import UUID

import internal_db_models
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends
from internal_aws_shared.s3 import generate_upload_url
from internal_db_repositories.file import FileRepository
from pydantic import BaseModel

from api.containers import Container
from api.settings import Settings

logger = logging.getLogger(__name__)
router = APIRouter()


class UploadIntentRequest(BaseModel):
    file_name: str
    file_size: int


class UploadIntentResponse(BaseModel):
    upload_url: str
    headers: dict[str, str]
    file: internal_db_models.FileRead


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
        internal_db_models.FileCreate(
            project_id=project_id,
            name=request.file_name,
            type=mimetypes.guess_type(request.file_name)[0]
            or "application/octet-stream",
            size=request.file_size,
            url=s3_path,
            thumbnail_url=None,
            status=internal_db_models.FileStatus.PENDING,
            error=None,
            id=file_id,
        )
    )

    return UploadIntentResponse(
        upload_url=upload_url,
        headers=headers,
        file=file,
    )
