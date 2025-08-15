import logging
from collections.abc import Callable
from uuid import UUID

import internal_db_models
from internal_db_repositories.file import FileRepository
from internal_db_repositories.file_content import FileContentRepository
from internal_services.evaluation import EvaluationService
from internal_vmx_utils.client import VMXClientResource
from pydantic import BaseModel
from vmxai import (
    RequestToolChoiceFunction,
    RequestToolChoiceItem,
    RequestToolFunction,
    RequestTools,
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
        vmx_client_resource: VMXClientResource,
        ingestion_callback_url: str,
    ):
        self._evaluation_service = evaluation_service
        self._file_repository = file_repository
        self._file_content_repository = file_content_repository
        self._vmx_client = vmx_client_resource.client
        self._vmx_resource_id = vmx_client_resource.resource_id
        self._ingestion_callback_url = ingestion_callback_url

    def temporal_factory(self) -> Callable:
        from temporalio import activity

        @activity.defn(name="StartEvaluationsActivity")
        async def _activity(
            file_id: UUID,
            evaluation_id: UUID | None = None,
            parent_evaluation_id: UUID | None = None,
            parent_evaluation_option: str | None = None,
        ) -> StartEvaluationOutput:
            return await self.run(
                file_id, evaluation_id, parent_evaluation_id, parent_evaluation_option
            )

        return _activity

    async def run(
        self,
        file_id: UUID,
        evaluation_id: UUID | None = None,
        parent_evaluation_id: UUID | None = None,
        parent_evaluation_option: str | None = None,
        parent_file_content_id: UUID | None = None,
    ) -> StartEvaluationOutput:
        from temporalio import activity

        workflow_id = activity.info().workflow_id
        requests, evaluations = await self.generate_llm_requests(
            file_id,
            workflow_id,
            evaluation_id,
            parent_evaluation_id,
            parent_evaluation_option,
            parent_file_content_id,
        )

        if len(requests) == 0:
            return StartEvaluationOutput(
                evaluation_ids=[],
                batch_id=None,
                batch_item_ids=None,
            )

        workflow_id = activity.info().workflow_id
        callback_url = f"{self._ingestion_callback_url}?workflow_id={workflow_id}"

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

    async def generate_llm_requests(
        self,
        file_id: UUID,
        workflow_id: str,
        evaluation_id: UUID | None = None,
        parent_evaluation_id: UUID | None = None,
        parent_evaluation_option: str | None = None,
        parent_file_content_id: UUID | None = None,
    ) -> tuple[list[CompletionRequest], list[internal_db_models.EvaluationRead]]:
        file = await self._file_repository.get(file_id)
        if not file:
            raise ValueError(f"File {file_id} not found")

        await self._file_repository.update(
            file_id, {"status": internal_db_models.FileStatus.EVALUATING}
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
            return [], []

        requests: list[CompletionRequest] = []
        file_contents = (
            [await self._file_content_repository.get(parent_file_content_id)]
            if parent_file_content_id
            else await self._file_content_repository.get_by_file_id(file_id)
        )

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
                    resource=self._vmx_resource_id,
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
                    case internal_db_models.EvaluationType.BOOLEAN:
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
                    case internal_db_models.EvaluationType.ENUM_CHOICE:
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

        return requests, evaluations
