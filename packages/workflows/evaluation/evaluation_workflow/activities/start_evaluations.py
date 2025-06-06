import logging
from typing import Optional
from uuid import UUID

import dm_db_models
from dm_db_repositories.file import FileRepository
from dm_db_repositories.file_content import FileContentRepository
from dm_services.evaluation import EvaluationService
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
    CompletionRequest,
    RequestMessage,
)

logger = logging.getLogger(__name__)


class StartEvaluationOutput(BaseModel):
    evaluation_ids: list[UUID]
    batch_id: UUID | None
    batch_item_ids: list[UUID] | None


BOOLEAN_TOOL = RequestToolFunction(
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
)


def ENUM_TOOL(options: list[str]) -> RequestToolFunction:
    return RequestToolFunction(
        name="enum_answer",
        description="Answer an enum question",
        parameters={
            "type": "object",
            "properties": {
                "answer": {
                    "type": "string",
                    "description": "The answer to the question",
                    "enum": options,
                },
            },
            "required": ["answer"],
        },
    )


class StartEvaluationsActivity:
    def __init__(
        self,
        evaluation_service: EvaluationService,
        file_repository: FileRepository,
        file_content_repository: FileContentRepository,
        vmx_client: VMXClient,
        ingestion_callback_url: str,
    ):
        self._evaluation_service = evaluation_service
        self._file_repository = file_repository
        self._file_content_repository = file_content_repository
        self._vmx_client = vmx_client
        self._ingestion_callback_url = ingestion_callback_url

    @activity.defn(name="StartEvaluationsActivity")
    async def run(
        self,
        file_id: UUID,
        evaluation_id: Optional[UUID] = None,
        parent_evaluation_id: Optional[UUID] = None,
        parent_evaluation_option: Optional[str] = None,
    ) -> StartEvaluationOutput:
        workflow_id = activity.info().workflow_id
        file = await self._file_repository.get(file_id)
        if not file:
            raise ValueError(f"File {file_id} not found")

        await self._file_repository.update(
            file_id, {"status": dm_db_models.FileStatus.EVALUATING}
        )

        logger.info(f"Starting evaluations for file {file_id}")
        logger.info(f"Getting questions for project {file.project_id}")
        if evaluation_id and not parent_evaluation_id and not parent_evaluation_option:
            evaluations = [await self._evaluation_service.get(evaluation_id)]
        else:
            evaluations = await self._evaluation_service.get_by_project_id_and_parent_evaluation_id(  # noqa: E501
                project_id=file.project_id,
                parent_evaluation_id=parent_evaluation_id,
                parent_evaluation_option=parent_evaluation_option,
            )

        logger.info(
            f"Found {len(evaluations)} evaluations for project {file.project_id}"
        )

        if not evaluations:
            return StartEvaluationOutput(
                evaluation_ids=[],
                batch_id=None,
                batch_item_ids=None,
            )

        requests: list[CompletionRequest] = []
        file_contents = await self._file_content_repository.get_by_file_id(file_id)

        for file_content in file_contents:
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
                            f"Document Page: {file_content.content}"
                            f"\n\nMetadata: {file_content.content_metadata}"
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
                        "file_id": str(file_id),
                        "file_content_id": str(file_content.id),
                        "page_metadata": file_content.content_metadata,
                        "workflow_id": workflow_id,
                        "parent_evaluation_id": str(parent_evaluation_id)
                        if parent_evaluation_id
                        else None,
                        "parent_evaluation_option": parent_evaluation_option,
                    },
                )

                match evaluation.evaluation_type:
                    case dm_db_models.EvaluationType.BOOLEAN:
                        request.tools = [
                            RequestTools(
                                type="function",
                                function=BOOLEAN_TOOL,
                            )
                        ]
                        request.tool_choice = RequestToolChoiceItem(
                            type="function",
                            function=RequestToolChoiceFunction(
                                name="boolean_answer",
                            ),
                        )
                    case dm_db_models.EvaluationType.ENUM_CHOICE:
                        request.tools = [
                            RequestTools(
                                type="function",
                                function=ENUM_TOOL(evaluation.evaluation_options),
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

        callback_url = f"{self._ingestion_callback_url}/{workflow_id}"

        batch_response = await self._vmx_client.completion_batch_callback(
            requests=requests,
            callback_options=BatchRequestCallbackOptions(
                headers={},
                url=callback_url,
                events=["ITEM_UPDATE"],
            ),
        )

        return StartEvaluationOutput(
            evaluation_ids=[evaluation.id for evaluation in evaluations],
            batch_id=batch_response.batch_id,
            batch_item_ids=[item.item_id for item in batch_response.items],
        )
