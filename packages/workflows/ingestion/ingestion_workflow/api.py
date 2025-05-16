import asyncio
import logging
import mimetypes
import os
import uuid
from uuid import UUID

import requests
import uvicorn
from dependency_injector.wiring import Provide, inject
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import col
from temporalio.client import Client
from utils.s3 import generate_download_url, generate_upload_url
from vmxai.types import CompletionBatchItemUpdateCallbackPayload

from ingestion_workflow import models
from ingestion_workflow.containers import Container
from ingestion_workflow.repositories.evaluation import EvaluationRepository
from ingestion_workflow.repositories.file import FileRepository
from ingestion_workflow.repositories.file_evaluation import FileEvaluationRepository
from ingestion_workflow.repositories.project import ProjectRepository
from ingestion_workflow.schema.s3 import S3Event
from ingestion_workflow.schema.sns import SnsMessage
from ingestion_workflow.settings import Settings
from ingestion_workflow.workflow import IngestionWorkflow


async def lifespan(app: FastAPI):
    container = Container()
    await container.init_resources()
    container.wire(modules=[__name__])
    app.container = container  # type: ignore
    yield
    await container.shutdown_resources()


app = FastAPI(title="Ingestion Workflow", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)


async def update_thumbnail_url(file: models.FileRead) -> models.FileRead:
    if file.thumbnail_url:
        file.thumbnail_url = await generate_download_url(
            file.thumbnail_url,
            Container.aioboto3_session(),
        )
    return file


@app.post(
    "/ingest",
    operation_id="ingest",
    description=(
        "Receives the SNS notification from the S3 Object "
        "Created event and starts the ingestion workflow"
    ),
    include_in_schema=False,
)
@inject
async def ingest(
    request: Request,
    temporal_client: Client = Depends(Provide[Container.temporal_client]),
):
    logger.info(f"Ingesting request for {temporal_client}")
    body = await request.body()
    message = SnsMessage.model_validate_json(body.decode("utf-8"), by_alias=True)
    match message.root.type:
        case "SubscriptionConfirmation":
            logger.info(f"Confirming subscription for {message.root.subscribe_url}")
            subscription_response = requests.get(message.root.subscribe_url)
            logger.info(f"Subscription response: {subscription_response.status_code}")
            logger.info(f"Subscription response: {subscription_response.text}")
            if subscription_response.status_code != 200:
                raise HTTPException(
                    status_code=400, detail="Subscription confirmation failed"
                )
        case "Notification":
            logger.info(f"Ingesting notification for {message.root.unsubscribe_url}")

            asyncio.ensure_future(
                temporal_client.start_workflow(
                    IngestionWorkflow.run,
                    id=f"ingestion-workflow-{message.root.message_id}",
                    task_queue="ingestion-workflow",
                    args=[
                        S3Event.model_validate_json(message.root.message, by_alias=True)
                    ],
                )
            )


@app.post(
    "/ingestion-callback/{workflow_id}",
    operation_id="ingestionCallback",
    description=(
        "Receives the callback from VM-X when a task is completed "
        "and updates the workflow"
    ),
    include_in_schema=False,
)
@inject
async def ingestion_callback(
    workflow_id: str,
    payload: CompletionBatchItemUpdateCallbackPayload,
    temporal_client: Client = Depends(Provide[Container.temporal_client]),
) -> None:
    logger.info(f"Ingestion callback for {workflow_id}")
    workflow_handle = temporal_client.get_workflow_handle(workflow_id)
    if payload.event == "ITEM_UPDATE":
        await workflow_handle.signal("evaluate_item", payload)


@app.get(
    "/projects",
    operation_id="getProjects",
    description="Get all projects",
    response_model=list[models.ProjectRead],
)
@inject
async def get_projects(
    project_repository: ProjectRepository = Depends(
        Provide[Container.project_repository]
    ),
) -> list[models.ProjectRead]:
    return await project_repository.get_all(
        order_by=col(models.Project.created_at),
        order_type="desc",
    )


class UploadIntentRequest(BaseModel):
    file_name: str
    file_size: int


class UploadIntentResponse(BaseModel):
    upload_url: str
    file: models.FileRead


@app.post(
    "/projects/{project_id}/upload-intent",
    operation_id="uploadIntent",
    description="Upload an intent for a project",
    response_model=UploadIntentResponse,
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

    upload_url = await generate_upload_url(
        s3_path,
        request.file_size,
        Container.aioboto3_session(),
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
        file=file,
    )


@app.get(
    "/projects/{project_id}/file/{file_id}",
    operation_id="getFile",
    description="Get a file by project and file id",
    response_model=models.FileRead,
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

    if file.thumbnail_url:
        file.thumbnail_url = await generate_download_url(
            file.thumbnail_url,
            Container.aioboto3_session(),
        )

    return file


@app.get(
    "/projects/{project_id}/evaluations",
    operation_id="getEvaluations",
    description="Get all evaluations for a project",
    response_model=list[models.EvaluationRead],
)
@inject
async def get_evaluations(
    project_id: UUID,
    evaluation_repository: EvaluationRepository = Depends(
        Provide[Container.evaluation_repository]
    ),
) -> list[models.EvaluationRead]:
    return await evaluation_repository.get_by_project_id(
        project_id=project_id,
    )


@app.get(
    "/projects/{project_id}/files",
    operation_id="getFiles",
    description="Get all files for a project",
    response_model=list[models.FileRead],
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


@app.get(
    "/projects/{project_id}/evaluation/{evaluation_id}/files",
    operation_id="getFilesByEvaluation",
    description="Get all files for an evaluation",
    response_model=list[models.FileEvaluationReadWithFile],
)
@inject
async def get_files_by_evaluation(
    project_id: UUID,
    evaluation_id: UUID,
    option_value: str | None = Query(default=None),
    file_evaluation_repository: FileEvaluationRepository = Depends(
        Provide[Container.file_evaluation_repository]
    ),
) -> list[models.FileEvaluationReadWithFile]:
    files = await file_evaluation_repository.get_by_evaluation_id(
        project_id=project_id,
        evaluation_id=evaluation_id,
        option_value=option_value,
    )

    async def update_file_evaluation(
        file_evaluation: models.FileEvaluationReadWithFile,
    ) -> models.FileEvaluationReadWithFile:
        if file_evaluation.file.thumbnail_url:
            file_evaluation.file.thumbnail_url = await generate_download_url(
                file_evaluation.file.thumbnail_url,
                Container.aioboto3_session(),
            )
        return file_evaluation

    return await asyncio.gather(
        *[update_file_evaluation(file_evaluation) for file_evaluation in files]
    )


if __name__ == "__main__":
    uvicorn.run(
        "ingestion_workflow.api:app", host="0.0.0.0", port=8000, reload=True, workers=2
    )
