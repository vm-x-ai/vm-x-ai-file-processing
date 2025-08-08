import json
import logging
import uuid
from typing import Callable
from uuid import UUID

import internal_db_models
from google.protobuf.json_format import MessageToDict
from internal_db_repositories.evaluation import EvaluationRepository
from internal_db_repositories.file import FileRepository
from internal_db_repositories.file_evaluation import FileEvaluationRepository
from vmxai.types import (
    CompletionBatchItemUpdateCallbackPayload,
    CompletionBatchRequestStatus,
)

logger = logging.getLogger(__name__)


class StoreEvaluationActivity:
    def __init__(
        self,
        file_repository: FileRepository,
        evaluation_repository: EvaluationRepository,
        file_evaluation_repository: FileEvaluationRepository,
    ):
        self._file_repository = file_repository
        self._evaluation_repository = evaluation_repository
        self._file_evaluation_repository = file_evaluation_repository

    def temporal_factory(self) -> Callable:
        from temporalio import activity

        @activity.defn(name="StoreEvaluationActivity")
        async def _activity(
            file_id: UUID,
            evaluation_id: UUID,
            file_content_id: UUID,
            result: CompletionBatchItemUpdateCallbackPayload,
        ):
            return await self.run(file_id, evaluation_id, file_content_id, result)

        return _activity

    async def run(
        self,
        file_id: UUID,
        evaluation_id: UUID,
        file_content_id: UUID,
        result: CompletionBatchItemUpdateCallbackPayload,
    ):
        file = await self._file_repository.get(file_id)
        if not file:
            raise ValueError(f"File {file_id} not found")

        evaluation = await self._evaluation_repository.get(evaluation_id)
        if not evaluation:
            raise ValueError(f"Evaluation {evaluation_id} not found")

        if not result.payload.response:
            raise ValueError("No response from VMX")

        response: str | None = None

        match evaluation.evaluation_type:
            case internal_db_models.EvaluationType.BOOLEAN:
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
            case internal_db_models.EvaluationType.ENUM_CHOICE:
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
            case internal_db_models.EvaluationType.TEXT:
                response = result.payload.response.message

        existing_file_evaluation = (
            await self._file_evaluation_repository.get_by_evaluation_id_and_content_id(
                project_id=file.project_id,
                evaluation_id=evaluation_id,
                content_id=file_content_id,
            )
        )

        status = (
            internal_db_models.FileEvaluationStatus.COMPLETED
            if result.payload.status == CompletionBatchRequestStatus.COMPLETED
            else internal_db_models.FileEvaluationStatus.FAILED
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
            await self._file_evaluation_repository.update(
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
            await self._file_evaluation_repository.add(
                internal_db_models.FileEvaluationCreate(
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
