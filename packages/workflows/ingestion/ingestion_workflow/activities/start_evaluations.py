import logging
from typing import Optional
from uuid import UUID

from langchain_core.documents import Document
from pydantic import BaseModel
from temporalio import activity
from vmxai import (
    RequestToolChoiceFunction,
    RequestToolChoiceItem,
    RequestToolFunction,
    RequestTools,
    VMXClient,
)
from vmxai.types import (
    BatchRequestCallbackOptions,
    CompletionBatchResponse,
    CompletionRequest,
    RequestMessage,
)

from ingestion_workflow import models
from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


class StartEvaluationOutput(BaseModel):
    evaluations: dict[UUID, models.EvaluationRead]
    batch_response: CompletionBatchResponse | None


@activity.defn
async def start_evaluations(
    file: models.FileRead,
    docs: list[Document],
    parent_evaluation_id: Optional[UUID] = None,
    parent_evaluation_option: Optional[str] = None,
) -> StartEvaluationOutput:
    workflow_id = activity.info().workflow_id
    evaluation_repository = Container.evaluation_repository()
    file_repository = Container.file_repository()
    settings = Container.settings()

    await file_repository.update(file.id, {"status": models.FileStatus.EVALUATING})

    logger.info(f"Starting evaluations for file {file.id}")
    logger.info(f"Getting questions for project {file.project_id}")
    evaluations = (
        await evaluation_repository.get_by_project_id_and_parent_evaluation_id(
            project_id=file.project_id,
            parent_evaluation_id=parent_evaluation_id,
            parent_evaluation_option=parent_evaluation_option,
        )
    )
    logger.info(f"Found {len(evaluations)} evaluations for project {file.project_id}")

    if not evaluations:
        return StartEvaluationOutput(
            evaluations={},
            batch_response=None,
        )

    requests: list[CompletionRequest] = []

    for doc in docs:
        for evaluation in evaluations:
            messages: list[RequestMessage] = []
            if evaluation.system_prompt:
                messages.append(
                    RequestMessage(
                        role="system",
                        content=evaluation.system_prompt,
                    )
                )

            messages.append(
                RequestMessage(
                    role="system",
                    content=(
                        f"Document Page: {doc.page_content}\n\nMetadata: {doc.metadata}"
                    ),
                )
            )

            messages.append(
                RequestMessage(
                    role="user",
                    content=evaluation.prompt,
                )
            )

            request = CompletionRequest(
                messages=messages,
                resource="default",
                metadata={
                    "evaluation_id": str(evaluation.id),
                    "file_id": str(file.id),
                    "page_metadata": doc.metadata,
                    "workflow_id": workflow_id,
                    "parent_evaluation_id": str(parent_evaluation_id)
                    if parent_evaluation_id
                    else None,
                    "parent_evaluation_option": parent_evaluation_option,
                },
            )

            match evaluation.evaluation_type:
                case models.EvaluationType.BOOLEAN:
                    request.tools = [
                        RequestTools(
                            type="function",
                            function=RequestToolFunction(
                                name="boolean_answer",
                                description="Answer a boolean question",
                                parameters={
                                    "type": "object",
                                    "properties": {
                                        "answer": {
                                            "type": "boolean",
                                            "description": "The answer to the question",
                                        },
                                    },
                                    "required": ["answer"],
                                },
                            ),
                        )
                    ]
                    request.tool_choice = RequestToolChoiceItem(
                        type="function",
                        function=RequestToolChoiceFunction(
                            name="boolean_answer",
                        ),
                    )
                case models.EvaluationType.ENUM_CHOICE:
                    request.tools = [
                        RequestTools(
                            type="function",
                            function=RequestToolFunction(
                                name="enum_answer",
                                description="Answer an enum question",
                                parameters={
                                    "type": "object",
                                    "properties": {
                                        "answer": {
                                            "type": "string",
                                            "description": "The answer to the question",
                                            "enum": evaluation.evaluation_options,
                                        },
                                    },
                                    "required": ["answer"],
                                },
                            ),
                        )
                    ]
                    request.tool_choice = RequestToolChoiceItem(
                        type="function",
                        function=RequestToolChoiceFunction(
                            name="enum_answer",
                        ),
                    )

            requests.append(request)

    if file.type != "application/pdf":
        raise ValueError("Only PDF files are supported for evaluation")

    vmx = VMXClient(
        domain=settings.vmx.domain,
        api_key=settings.vmx.api_key,
        workspace_id=settings.vmx.workspace_id,
        environment_id=settings.vmx.environment_id,
    )

    callback_url = f"http://localhost:8000/ingestion-callback/{workflow_id}"

    batch_response = await vmx.completion_batch_callback(
        requests=requests,
        callback_options=BatchRequestCallbackOptions(
            headers={},
            url=callback_url,
            events=["ITEM_UPDATE"],
        ),
    )

    return StartEvaluationOutput(
        evaluations={evaluation.id: evaluation for evaluation in evaluations},
        batch_response=batch_response,
    )
