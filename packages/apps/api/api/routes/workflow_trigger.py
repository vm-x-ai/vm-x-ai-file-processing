import asyncio
import json
import logging

import requests
from dependency_injector.wiring import Provide, inject
from dm_schemas.s3 import S3Event
from dm_schemas.sns import SnsMessage
from fastapi import APIRouter, Depends, HTTPException, Request
from temporalio.client import Client

from api.containers import Container

router = APIRouter(
    prefix="/workflow",
    tags=["workflow"],
)
logger = logging.getLogger(__name__)


@router.post(
    "/ingestion/trigger",
    operation_id="ingestionTrigger",
    description=(
        "Receives the SNS notification from the S3 Object "
        "Created event and starts the ingestion workflow"
    ),
    include_in_schema=False,
    tags=["ingestion", "trigger"],
)
@inject
async def ingestion_trigger(
    request: Request,
    temporal_client: Client = Depends(Provide[Container.temporal_client]),
):
    logger.info(f"Ingesting request for {temporal_client}")
    body = await request.body()
    message = SnsMessage.model_validate_json(body.decode("utf-8"), by_alias=True)
    match message.root.type:
        case "SubscriptionConfirmation":
            _confirm_subscription(message)
        case "Notification":
            logger.info(f"Ingesting notification for {message.root.unsubscribe_url}")

            asyncio.ensure_future(
                temporal_client.start_workflow(
                    "IngestionWorkflow",
                    id=f"ingestion-workflow-{message.root.message_id}",
                    task_queue="temporal-worker",
                    args=[
                        S3Event.model_validate_json(message.root.message, by_alias=True)
                    ],
                )
            )


@router.post(
    "/evaluation/trigger",
    operation_id="evaluationTrigger",
    description=(
        "Receives the SNS notification from the Event Bus "
        "and starts the evaluation workflow"
    ),
    include_in_schema=False,
    tags=["evaluation", "trigger"],
)
@inject
async def evaluation_trigger(
    request: Request,
    temporal_client: Client = Depends(Provide[Container.temporal_client]),
):
    logger.info(f"Ingesting request for {temporal_client}")
    body = await request.body()
    message = SnsMessage.model_validate_json(body.decode("utf-8"), by_alias=True)
    match message.root.type:
        case "SubscriptionConfirmation":
            _confirm_subscription(message)
        case "Notification":
            logger.info(f"Evaluating notification for {message.root.unsubscribe_url}")

            asyncio.ensure_future(
                temporal_client.start_workflow(
                    "EvaluationWorkflow",
                    id=f"evaluation-workflow-{message.root.message_id}",
                    task_queue="temporal-worker",
                    args=[
                        json.loads(message.root.message)["file_id"],
                    ],
                )
            )


def _confirm_subscription(message: SnsMessage) -> None:
    logger.info(f"Confirming subscription for {message.root.subscribe_url}")
    subscription_response = requests.get(message.root.subscribe_url)
    logger.info(f"Subscription response: {subscription_response.status_code}")
    logger.info(f"Subscription response: {subscription_response.text}")
    if subscription_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Subscription confirmation failed")
