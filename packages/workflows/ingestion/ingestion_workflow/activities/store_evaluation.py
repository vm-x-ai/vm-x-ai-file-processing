import json
import logging
import uuid
from uuid import UUID

import dm_db_models
from google.protobuf.json_format import MessageToDict
from temporalio import activity
from vmxai.types import (
    CompletionBatchItemUpdateCallbackPayload,
    CompletionBatchRequestStatus,
)

from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


@activity.defn
async def store_evaluation(
    file_id: UUID,
    evaluation_id: UUID,
    file_content_id: UUID,
    result: CompletionBatchItemUpdateCallbackPayload,
):
    file_repository = Container.file_repository()
    file = await file_repository.get(file_id)
    if not file:
        raise ValueError(f"File {file_id} not found")

    evaluation_repository = Container.evaluation_repository()
    evaluation = await evaluation_repository.get(evaluation_id)
    if not evaluation:
        raise ValueError(f"Evaluation {evaluation_id} not found")

    if not result.payload.response:
        raise ValueError("No response from VMX")

    response: str | None = None

    match evaluation.evaluation_type:
        case dm_db_models.EvaluationType.BOOLEAN:
            if not result.payload.response.tool_calls:
                raise ValueError("No tool calls from VMX")

            tool_call = result.payload.response.tool_calls[0]
            if tool_call.function.name != "boolean_answer":
                raise ValueError("Invalid tool call from VMX")

            boolean_answer = tool_call.function.arguments
            if not boolean_answer:
                raise ValueError("No boolean answer from VMX")

            boolean_answer = json.loads(boolean_answer)
            response = str(boolean_answer["answer"]).lower()
        case dm_db_models.EvaluationType.ENUM_CHOICE:
            if not result.payload.response.tool_calls:
                raise ValueError("No tool calls from VMX")

            tool_call = result.payload.response.tool_calls[0]
            if tool_call.function.name != "enum_answer":
                raise ValueError("Invalid tool call from VMX")

            enum_answer = tool_call.function.arguments
            if not enum_answer:
                raise ValueError("No enum answer from VMX")

            enum_answer = json.loads(enum_answer)
            response = enum_answer["answer"]
        case dm_db_models.EvaluationType.TEXT:
            response = result.payload.response.message

    file_evaluation_repository = Container.file_evaluation_repository()
    existing_file_evaluation = (
        await file_evaluation_repository.get_by_evaluation_id_and_content_id(
            project_id=file.project_id,
            evaluation_id=evaluation_id,
            content_id=file_content_id,
        )
    )

    status = (
        dm_db_models.FileEvaluationStatus.COMPLETED
        if result.payload.status == CompletionBatchRequestStatus.COMPLETED
        else dm_db_models.FileEvaluationStatus.FAILED
    )

    llm_request = result.payload.request.model_dump(mode="json")
    llm_response = MessageToDict(result.payload.response)

    if not llm_response or not llm_request:
        logger.warning(
            "No LLM request or response for "
            f"file evaluation {existing_file_evaluation.id}"
        )

    logger.info(f"LLM request: {type(llm_request)}")
    logger.info(f"LLM response: {type(llm_response)}")

    if existing_file_evaluation:
        logger.info(f"Updating file evaluation {existing_file_evaluation.id}")
        await file_evaluation_repository.update(
            existing_file_evaluation.id,
            {
                "response": response,
                "status": status,
                "error": result.payload.error,
                "llm_request": llm_request,
                "llm_response": llm_response,
            },
        )
    else:
        logger.info(
            "Creating new file evaluation, "
            f"evaluation_id: {evaluation_id}, content_id: {file_content_id}"
        )
        await file_evaluation_repository.add(
            dm_db_models.FileEvaluationCreate(
                id=uuid.uuid4(),
                file_id=file.id,
                evaluation_id=evaluation_id,
                response=response,
                content_id=file_content_id,
                status=status,
                error=result.payload.error,
                llm_request=llm_request or {},
                llm_response=llm_response or {},
            )
        )

    return response
