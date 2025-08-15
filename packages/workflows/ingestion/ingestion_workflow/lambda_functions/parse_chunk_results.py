import json
import logging
import uuid
from typing import Any

import boto3

logger = logging.getLogger(__name__)

s3_client = boto3.client("s3")


def handler(event: dict, context: Any):
    logger.info(f"Event: {event}")
    logger.info(f"Reading manifest from {event['bucket']}/{event['key']}")
    manifest_object = s3_client.get_object(
        Bucket=event["bucket"],
        Key=event["key"],
    )

    manifest_data = json.loads(manifest_object["Body"].read().decode("utf-8"))
    chunk_number = 0

    success_files = manifest_data["ResultFiles"]["SUCCEEDED"]
    logger.info(f"Found {len(success_files)} success files")

    for result_file in success_files:
        logger.info(f"Reading result file from {event['bucket']}/{result_file['Key']}")
        result_object = s3_client.get_object(
            Bucket=event["bucket"],
            Key=result_file["Key"],
        )

        target_data = []

        chunk_results = result_object["Body"].read().decode("utf-8").splitlines()
        logger.info(f"Found {len(chunk_results)} chunk results")

        for chunk_result in chunk_results:
            chunk_result_data = json.loads(chunk_result)
            for chunk_id in chunk_result_data["chunk_document"]["result"]["chunk_ids"]:
                chunk_number += 1
                target_data.append(
                    {
                        "chunk_id": chunk_id,
                        "file_id": event["file_id"],
                        "project_id": chunk_result_data["project_id"],
                        "file_content_id": chunk_result_data["file_content_id"],
                        "chunk_number": chunk_number,
                    }
                )

        target_key = (
            f"numbered_chunks/{event['file_id']}/"
            f"{event['execution_id']}/{uuid.uuid4()}.json"
        )
        logger.info(
            f"Writing {len(target_data)} chunk results "
            f"to {event['bucket']}/{target_key}"
        )
        s3_client.put_object(
            Bucket=event["bucket"],
            Key=target_key,
            Body=json.dumps(target_data).encode("utf-8"),
        )

    return {}
