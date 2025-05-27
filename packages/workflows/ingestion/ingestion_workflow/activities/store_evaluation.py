import json
import logging
import uuid
from uuid import UUID

from temporalio import activity
from vmxai.types import (
    CompletionBatchItemUpdateCallbackPayload,
    CompletionBatchRequestStatus,
)

from ingestion_workflow import models
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
        case models.EvaluationType.BOOLEAN:
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
        case models.EvaluationType.ENUM_CHOICE:
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
        case models.EvaluationType.TEXT:
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
        models.FileEvaluationStatus.COMPLETED
        if result.payload.status == CompletionBatchRequestStatus.COMPLETED
        else models.FileEvaluationStatus.FAILED
    )

    if existing_file_evaluation:
        logger.info(f"Updating file evaluation {existing_file_evaluation.id}")
        await file_evaluation_repository.update(
            existing_file_evaluation.id,
            {
                "response": response,
                "status": status,
                "error": result.payload.error,
            },
        )
    else:
        logger.info(
            "Creating new file evaluation, "
            f"evaluation_id: {evaluation_id}, content_id: {file_content_id}"
        )
        await file_evaluation_repository.add(
            models.FileEvaluationCreate(
                id=uuid.uuid4(),
                file_id=file.id,
                evaluation_id=evaluation_id,
                response=response,
                content_id=file_content_id,
                status=status,
                error=result.payload.error,
            )
        )

    return response
