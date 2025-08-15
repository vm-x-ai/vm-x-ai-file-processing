import json
import logging
import uuid
from typing import Any

import boto3

logger = logging.getLogger(__name__)

s3 = boto3.client("s3")


def handler(event: dict, context: Any) -> dict:
    logger.info(f"Initial evaluation setup: {event}")

    result_data = [
        {
            "file_id": event["file_id"],
            "evaluation_id": event.get("evaluation_id"),
            "parent_evaluation_id": None,
            "parent_evaluation_option": None,
            "parent_file_content_id": None,
        }
    ]

    s3_key = f"start_evaluations/{event['file_id']}/{uuid.uuid4()}.json"
    s3.put_object(
        Bucket=event["bucket_name"],
        Key=s3_key,
        Body=json.dumps(result_data).encode("utf-8"),
    )

    return {
        "s3_key": s3_key,
    }
