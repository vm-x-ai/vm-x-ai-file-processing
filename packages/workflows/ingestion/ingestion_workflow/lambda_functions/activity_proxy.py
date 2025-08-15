import asyncio
import logging
from typing import Any

from workflow_shared_actitivies.activity_proxy import proxy_activity

from ingestion_workflow.lambda_functions.containers import LambdaContainer

logger = logging.getLogger(__name__)

container = LambdaContainer()


async def main(event: dict):
    await container.init_resources()
    return await proxy_activity(
        container,
        event["activity"],
        event["args"],
    )


def handler(event: dict, context: Any):
    logger.info(f"Event: {event}")
    return asyncio.run(main(event))
