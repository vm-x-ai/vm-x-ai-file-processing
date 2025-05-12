import asyncio
import logging

import requests
import uvicorn
from dependency_injector.wiring import Provide, inject
from fastapi import Depends, FastAPI, HTTPException, Request
from temporalio.client import Client
from vmxai.types import CompletionBatchCallbackPayload

from ingestion_workflow.containers import Container
from ingestion_workflow.schema.s3 import S3Event
from ingestion_workflow.schema.sns import SnsMessage
from ingestion_workflow.workflow import IngestionWorkflow


async def lifespan(app: FastAPI):
    container = Container()
    await container.init_resources()
    container.wire(modules=[__name__])
    app.container = container  # type: ignore
    yield
    await container.shutdown_resources()


app = FastAPI(lifespan=lifespan)
logger = logging.getLogger(__name__)


@app.post("/ingest")
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

            return {"message": "Subscription confirmed"}
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
            return {"message": "Notification ingested"}


@app.post("/ingestion-callback/{workflow_id}")
@inject
async def ingestion_callback(
    workflow_id: str,
    payload: CompletionBatchCallbackPayload,
    temporal_client: Client = Depends(Provide[Container.temporal_client]),
):
    logger.info(f"Ingestion callback for {workflow_id}")
    workflow_handle = temporal_client.get_workflow_handle(workflow_id)
    if payload.root.event == "ITEM_UPDATE":
        await workflow_handle.signal("evaluate_item", payload.root)

    return {"message": "Ingestion callback received"}


if __name__ == "__main__":
    uvicorn.run(
        "ingestion_workflow.api:app", host="0.0.0.0", port=8000, reload=True, workers=2
    )
