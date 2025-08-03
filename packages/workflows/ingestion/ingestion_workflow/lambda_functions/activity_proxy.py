import asyncio
import logging
from typing import Any

from ingestion_workflow.lambda_functions.containers import LambdaContainer

logger = logging.getLogger(__name__)

container = LambdaContainer()

async def main(event: dict):
    await container.init_resources()

    activity_provider = getattr(container, event["activity"], None)
    if not activity_provider:
        raise ValueError(f"Activity {event['activity']} not found")
    
    activity = activity_provider()
    args = await activity.parse_args(**event["args"])
    result = await activity.run(**args)
    return result.model_dump(mode="json")


def handler(event: dict, context: Any):
    logger.info(f"Event: {event}")
    return asyncio.run(main(event))
