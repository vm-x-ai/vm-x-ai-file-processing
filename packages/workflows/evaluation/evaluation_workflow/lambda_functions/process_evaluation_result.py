import json
import logging
import uuid
from typing import Any

import boto3

logger = logging.getLogger(__name__)

s3 = boto3.client("s3")


def handler(event: dict, context: Any) -> dict:
    logger.info(f"Processing evaluation result: {event}")

    logger.info(f"Reading Evaluation Map Manifest: {event['s3_key']}")
    eval_map_manifest_obj = s3.get_object(
        Bucket=event["bucket_name"],
        Key=event["s3_key"],
    )

    eval_map_manifest = json.loads(eval_map_manifest_obj["Body"].read().decode("utf-8"))
    target_data = []
    target_map = {}
    total_llm_requests = 0

    for eval_map_item in eval_map_manifest["ResultFiles"]["SUCCEEDED"]:
        logger.info(f"Reading Evaluation Map File: {eval_map_item['Key']}")
        eval_map_item_obj = s3.get_object(
            Bucket=event["bucket_name"],
            Key=eval_map_item["Key"],
        )

        eval_map_item_data = json.loads(
            eval_map_item_obj["Body"].read().decode("utf-8")
        )
        logger.info(
            f"Processing {len(eval_map_item_data)} LLM Request "
            f"Manifests from {eval_map_item['Key']}"
        )
        for llm_request_map in eval_map_item_data:
            logger.info(
                f"Reading LLM Request Manifest: "
                f"{llm_request_map['llm_requests']['key']}"
            )
            llm_request_manifest_obj = s3.get_object(
                Bucket=llm_request_map["llm_requests"]["bucket"],
                Key=llm_request_map["llm_requests"]["key"],
            )

            llm_request_manifest = json.loads(
                llm_request_manifest_obj["Body"].read().decode("utf-8")
            )

            logger.info(
                f"Processing {len(llm_request_manifest['ResultFiles']['SUCCEEDED'])} "
                f"LLM Request Results from {llm_request_map['llm_requests']['key']}"
            )
            for llm_request_result in llm_request_manifest["ResultFiles"]["SUCCEEDED"]:
                logger.info(f"Reading LLM Request Result: {llm_request_result['Key']}")
                llm_request_result_obj = s3.get_object(
                    Bucket=llm_request_map["llm_requests"]["bucket"],
                    Key=llm_request_result["Key"],
                )

                llm_request_result_data = json.loads(
                    llm_request_result_obj["Body"].read().decode("utf-8")
                )

                logger.info(
                    f"Processing {len(llm_request_result_data)} LLM Request Items "
                    f"from {llm_request_result['Key']}"
                )
                for llm_request_item in llm_request_result_data:
                    total_llm_requests += 1
                    metadata = llm_request_item["llm_request"]["metadata"]
                    evaluation_id = metadata["evaluation_id"]
                    file_content_id = metadata["file_content_id"]
                    evaluation_result = llm_request_item["store_evaluation_response"][
                        "result"
                    ]
                    evaluation_key = (
                        f"{evaluation_id}-{file_content_id}-{evaluation_result}"
                    )

                    if evaluation_key in target_map:
                        continue

                    target_map[evaluation_key] = evaluation_id
                    target_data.append(
                        {
                            "file_id": llm_request_item["file_id"],
                            "evaluation_id": event.get("evaluation_id"),
                            "parent_evaluation_id": evaluation_id,
                            "parent_evaluation_option": evaluation_result,
                            "parent_file_content_id": file_content_id,
                        }
                    )

    logger.info(f"Total LLM Requests: {total_llm_requests}")
    logger.info(f"Next Evaluations to process: {len(target_data)}")

    if len(target_data) == 0:
        return {"s3_key": None}

    logger.info(f"Uploading {len(target_data)} Next Evaluations to S3")
    s3_key = f"start_evaluations/{event['file_id']}/{uuid.uuid4()}.json"
    s3.put_object(
        Bucket=event["bucket_name"],
        Key=s3_key,
        Body=json.dumps(target_data).encode("utf-8"),
    )

    return {
        "s3_key": s3_key,
    }
