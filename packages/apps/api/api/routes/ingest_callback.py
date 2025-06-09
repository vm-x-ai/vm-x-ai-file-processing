import logging

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends
from temporalio.client import Client
from vmxai.types import CompletionBatchItemUpdateCallbackPayload

from api.containers import Container

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/ingestion-callback/{workflow_id}",
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
    workflow_id: str,
    payload: CompletionBatchItemUpdateCallbackPayload,
    temporal_client: Client = Depends(Provide[Container.temporal_client]),
) -> None:
    logger.info(f"Ingestion callback for {workflow_id}")
    workflow_handle = temporal_client.get_workflow_handle(workflow_id)
    if payload.event == "ITEM_UPDATE":
        await workflow_handle.signal("evaluate_item", payload)
