from pydantic import BaseModel
from vmxai.types import CompletionBatchItemUpdateCallbackPayload

from internal_services.workflow.engine import BaseWorkflowEngineService


class StepFunctionsWorkflowService(BaseWorkflowEngineService):
    def __init__(self):
        super().__init__()

    async def start_workflow(
        self, workflow_name: str, id: str, payload: dict | BaseModel
    ):
        """TODO: Implement."""

    async def receive_batch_item_update_callback(
        self,
        query_params: dict[str, str],
        payload: CompletionBatchItemUpdateCallbackPayload,
    ) -> None:
        """TODO: Implement."""
