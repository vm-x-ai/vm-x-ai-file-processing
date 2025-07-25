import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Request
from internal_services import WorkflowEngineService
from vmxai.types import CompletionBatchItemUpdateCallbackPayload

from api.containers import Container

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/ingestion-callback",
    operation_id="ingestionCallback",
    description=(
        "Receives the callback from VM-X when a task is completed "
        "and updates the workflow"
    ),
    include_in_schema=False,
    tags=["ingest"],
)
@inject
async def ingestion_callback(
    request: Request,
    payload: CompletionBatchItemUpdateCallbackPayload,
    workflow_engine_service: WorkflowEngineService = Depends(
        Provide[Container.workflow_engine_service]
    ),
) -> None:
    await workflow_engine_service.receive_batch_item_update_callback(
        request.query_params, payload
    )
