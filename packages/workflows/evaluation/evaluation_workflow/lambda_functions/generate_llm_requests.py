import asyncio
import json
import logging
import uuid
from typing import Any

import boto3
from internal_utils import parse_args

from evaluation_workflow.activities.start_evaluations import StartEvaluationsActivity
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

    logger.info(f"Initializing start evaluations activity for file {event['file_id']}")
    activity: StartEvaluationsActivity = await container.start_evaluations_activity()
    logger.info("Parsing arguments for generate_llm_requests activity")
    parsed_args = parse_args(activity.generate_llm_requests, event)
    logger.info("Generating LLM requests")
    llm_requests, evaluations = await activity.generate_llm_requests(**parsed_args)

    logger.info(f"LLM requests: {llm_requests}")
    logger.info(f"Evaluations: {evaluations}")

    s3_key = f"start_evaluations_llm_requests/{event['file_id']}/{uuid.uuid4()}.json"
    logger.info(f"Uploading LLM requests to S3: {s3_key}")

    s3.put_object(
        Bucket=event["bucket_name"],
        Key=s3_key,
        Body=json.dumps(
            [
                {
                    "llm_request": llm_request.model_dump(mode="json"),
                    "file_id": event["file_id"],
                    "evaluation_id": event["evaluation_id"],
                    "parent_evaluation_id": event["parent_evaluation_id"],
                    "parent_evaluation_option": event["parent_evaluation_option"],
                }
                for llm_request in llm_requests
            ]
        ).encode("utf-8"),
    )

    return {"s3_key": s3_key}


def handler(event: dict, context: Any):
    logger.info(f"Event: {event}")
    return asyncio.run(main(event))
