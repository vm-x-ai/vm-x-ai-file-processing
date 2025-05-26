import asyncio
import logging
from uuid import UUID

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from utils.s3 import generate_download_url

from ingestion_workflow import models
from ingestion_workflow.containers import Container
from ingestion_workflow.repositories.file import FileRepository
from ingestion_workflow.repositories.file_evaluation import FileEvaluationRepository
from ingestion_workflow.schema.file import FileSearchRequest

router = APIRouter()
logger = logging.getLogger(__name__)


async def update_thumbnail_url(file: models.FileRead) -> models.FileRead:
    if file.thumbnail_url:
        file.thumbnail_url = await generate_download_url(
            file.thumbnail_url,
            Container.aioboto3_session(),
        )
    return file


@router.get(
    "/projects/{project_id}/files",
    operation_id="getFiles",
    description="Get all files for a project",
    response_model=list[models.FileRead],
    tags=["files"],
)
@inject
async def get_files(
    project_id: UUID,
    file_repository: FileRepository = Depends(Provide[Container.file_repository]),
) -> list[models.FileRead]:
    files = await file_repository.get_by_project_id(
        project_id=project_id,
    )

    return await asyncio.gather(*[update_thumbnail_url(file) for file in files])


@router.post(
    "/projects/{project_id}/files/search",
    operation_id="searchFiles",
    description="Search files for a project",
    response_model=list[models.FileReadWithEvaluations],
    tags=["files"],
)
@inject
async def search_files(
    project_id: UUID,
    request: FileSearchRequest,
    file_repository: FileRepository = Depends(Provide[Container.file_repository]),
) -> list[models.FileReadWithEvaluations]:
    return await file_repository.search_files(project_id, request)


@router.get(
    "/projects/{project_id}/file/{file_id}",
    operation_id="getFile",
    description="Get a file by project and file id",
    response_model=models.FileRead,
    tags=["files"],
)
@inject
async def get_file(
    project_id: UUID,
    file_id: UUID,
    file_repository: FileRepository = Depends(Provide[Container.file_repository]),
) -> models.FileRead:
    file = await file_repository.get(
        file_id,
    )
    if not file or file.project_id != project_id:
        raise HTTPException(status_code=404, detail="File not found")

    return await update_thumbnail_url(file)


@router.get(
    "/projects/{project_id}/file/{file_id}/evaluations",
    operation_id="getFileEvaluations",
    description="Get all evaluations for a file",
    response_model=list[models.FileEvaluationReadWithFile],
    tags=["files"],
)
@inject
async def get_file_evaluations(
    project_id: UUID,
    file_id: UUID,
    file_evaluation_repository: FileEvaluationRepository = Depends(
        Provide[Container.file_evaluation_repository]
    ),
) -> list[models.FileEvaluationReadWithFile]:
    file_evaluations = await file_evaluation_repository.get_by_file_id(
        project_id=project_id,
        file_id=file_id,
    )
    for file_evaluation in file_evaluations:
        if file_evaluation.file:
            file_evaluation.file = await update_thumbnail_url(file_evaluation.file)

    return file_evaluations


@router.delete(
    "/projects/{project_id}/file/{file_id}",
    operation_id="deleteFile",
    description="Delete a file by project and file id",
    tags=["files"],
)
@inject
async def delete_file(
    project_id: UUID,
    file_id: UUID,
    file_repository: FileRepository = Depends(Provide[Container.file_repository]),
) -> None:
    await file_repository.delete(file_id)
