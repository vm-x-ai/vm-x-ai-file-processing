import asyncio

from pydantic import BaseModel
from temporalio.client import Client
from vmxai.types import CompletionBatchItemUpdateCallbackPayload

from internal_services.workflow.engine import BaseWorkflowEngineService


class TemporalWorkflowService(BaseWorkflowEngineService):
    def __init__(self, temporal_client: Client):
        super().__init__()
        self._temporal_client = temporal_client

    async def start_workflow(
        self, workflow_name: str, id: str, payload: dict | BaseModel
    ):
        asyncio.ensure_future(
            self._temporal_client.start_workflow(
                workflow_name,
                id=id,
                task_queue="temporal-worker",
                args=[payload],
            )
        )

    async def receive_batch_item_update_callback(
        self,
        query_params: dict[str, str],
        payload: CompletionBatchItemUpdateCallbackPayload,
    ) -> None:
        self._logger.info(f"Ingestion callback for {query_params}")
        workflow_handle = self._temporal_client.get_workflow_handle(
            query_params["workflow_id"]
        )
        if payload.event == "ITEM_UPDATE":
            await workflow_handle.signal("evaluate_item", payload)
