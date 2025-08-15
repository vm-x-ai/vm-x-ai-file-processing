import json
import os
import urllib.parse
import uuid

import aioboto3
from pydantic import BaseModel
from vmxai.types import CompletionBatchItemUpdateCallbackPayload

from internal_services.workflow.engine import BaseWorkflowEngineService

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCOUNT_ID = os.getenv("AWS_ACCOUNT_ID")
RESOURCE_PREFIX = os.getenv("RESOURCE_PREFIX")
STATE_MACHINE_BASE_ARN = f"arn:aws:states:{AWS_REGION}:{AWS_ACCOUNT_ID}:stateMachine:"
ENV = os.getenv("ENV")

WORKFLOW_NAME_MAP = {
    "UpdateEvaluationWorkflow": (
        f"{RESOURCE_PREFIX}-update-evaluation-workflow-state-machine-{ENV}"
    ),
}


class StepFunctionsWorkflowService(BaseWorkflowEngineService):
    def __init__(self, aioboto3_session: aioboto3.Session):
        super().__init__()

        self._aioboto3_session = aioboto3_session

    async def start_workflow(
        self, workflow_name: str, id: str, payload: dict | BaseModel
    ):
        if workflow_name not in WORKFLOW_NAME_MAP:
            raise ValueError(f"Workflow {workflow_name} not found")

        async with self._aioboto3_session.client("stepfunctions") as sfn:
            await sfn.start_execution(
                stateMachineArn=f"{STATE_MACHINE_BASE_ARN}{WORKFLOW_NAME_MAP[workflow_name]}",
                name=str(uuid.uuid4()),
                input=payload.model_dump_json()
                if isinstance(payload, BaseModel)
                else json.dumps(payload),
            )

    async def receive_batch_item_update_callback(
        self,
        query_params: dict[str, str],
        payload: CompletionBatchItemUpdateCallbackPayload,
    ) -> None:
        if payload.event == "ITEM_UPDATE":
            async with self._aioboto3_session.client("stepfunctions") as sfn:
                await sfn.send_task_success(
                    taskToken=urllib.parse.unquote(query_params["taskToken"]),
                    output=payload.model_dump_json(),
                )
