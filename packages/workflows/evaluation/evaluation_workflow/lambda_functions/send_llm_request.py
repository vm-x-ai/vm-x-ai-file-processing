import asyncio
import logging
import urllib.parse
from typing import Any

import boto3
from internal_vmx_utils.client import VMXClientResource
from vmxai.types import (
    BatchRequestCallbackOptions,
    CompletionRequest,
)

from evaluation_workflow.lambda_functions.containers import LambdaContainer

logger = logging.getLogger(__name__)

_container: LambdaContainer | None = None

s3 = boto3.client("s3")


async def get_container():
    global _container
    if _container is None:
        _container = LambdaContainer()
        await _container.init_resources()
    return _container


async def main(event: dict):
    container = await get_container()

    logger.info("Initializing VM-X client")
    vmx_client: VMXClientResource = await container.vmx_client()
    settings = container.settings()

    requests = [CompletionRequest.model_validate(event["request"])]

    task_token = urllib.parse.quote(event["taskToken"], safe="")
    callback_url = f"{settings.ingestion_callback.url}?taskToken={task_token}"

    batch_response = await vmx_client.client.completion_batch_callback(
        requests=requests,
        callback_options=BatchRequestCallbackOptions(
            headers={},
            url=callback_url,
            events=["ITEM_UPDATE"],
        ),
    )

    return {
        "batch_id": batch_response.batch_id,
        "batch_item_ids": [item.item_id for item in batch_response.items],
    }


def handler(event: dict, context: Any):
    logger.info(f"Event: {event}")
    return asyncio.run(main(event))
