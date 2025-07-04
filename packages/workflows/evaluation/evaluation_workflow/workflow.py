import asyncio
import logging
from datetime import timedelta
from typing import Optional
from uuid import UUID

import vmxfp_db_models
from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError

with workflow.unsafe.imports_passed_through():
    import workflow_shared_actitivies
    from vmxai.types import CompletionBatchItemUpdateCallbackPayload

    from . import activities


logger = logging.getLogger(__name__)

DEFAULT_RETRY_POLICY = RetryPolicy(maximum_attempts=3)
DEFAULT_TIMEOUT = timedelta(seconds=300)


@workflow.defn(name="EvaluationWorkflow")
class EvaluationWorkflow:
    @workflow.run
    async def run(self, file_id: UUID) -> dict:
        try:
            self.evaluations_map: dict[str, UUID] = {}
            await self.process_evaluations(file_id)

            await workflow.execute_activity(
                workflow_shared_actitivies.UpdateFileStatusActivity.run,
                args=[file_id, vmxfp_db_models.FileStatus.COMPLETED],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            return file_id
        except Exception as e:
            error_msg = f"Error in ingestion workflow: {e}"
            workflow.logger.error(error_msg)
            await workflow.execute_activity(
                workflow_shared_actitivies.UpdateFileStatusActivity.run,
                args=[file_id, vmxfp_db_models.FileStatus.FAILED],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            raise ApplicationError(error_msg) from e

    async def process_evaluations(
        self,
        file_id: UUID,
        parent_evaluation_id: Optional[UUID] = None,
        parent_evaluation_option: Optional[str] = None,
    ):
        logger.info(
            f"Processing evaluations for file {file_id}, "
            f"parent_evaluation_id: {parent_evaluation_id}, "
            f"parent_evaluation_option: {parent_evaluation_option}"
        )
        evaluations_results: list[tuple[UUID, str]] = []
        evaluation_output = await workflow.execute_activity(
            activities.StartEvaluationsActivity.run,
            args=[
                file_id,
                None,
                parent_evaluation_id,
                parent_evaluation_option,
            ],
            start_to_close_timeout=DEFAULT_TIMEOUT,
            retry_policy=DEFAULT_RETRY_POLICY,
        )

        if not evaluation_output.batch_item_ids:
            return

        @workflow.signal
        async def evaluate_item(result: CompletionBatchItemUpdateCallbackPayload):
            evaluation_id = UUID(result.payload.request.metadata["evaluation_id"])
            file_content_id = UUID(result.payload.request.metadata["file_content_id"])

            response_value = await workflow.execute_activity(
                activities.StoreEvaluationActivity.run,
                args=[file_id, evaluation_id, file_content_id, result],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            evaluations_results.append((evaluation_id, response_value))

        workflow.set_signal_handler("evaluate_item", evaluate_item)

        # # Wait for all evaluations
        await workflow.wait_condition(
            lambda: len(evaluations_results) == len(evaluation_output.batch_item_ids)
        )

        for evaluation_id, response_value in evaluations_results:
            evaluation_key = f"{evaluation_id}-{response_value}"

            if evaluation_key in self.evaluations_map:
                continue

            await self.process_evaluations(
                file_id,
                evaluation_id,
                response_value,
            )
            self.evaluations_map[evaluation_key] = evaluation_id


@workflow.defn(name="UpdateEvaluationWorkflow")
class UpdateEvaluationWorkflow:
    @workflow.run
    async def run(
        self,
        evaluation: vmxfp_db_models.EvaluationRead,
        old_evaluation: vmxfp_db_models.EvaluationRead | None = None,
    ):
        try:
            files_to_evaluate = await workflow.execute_activity(
                activities.GetFilesToEvaluateActivity.run,
                args=[evaluation, old_evaluation],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            self.evaluations_map: dict[str, UUID] = {}

            for file_id in files_to_evaluate:
                await self.process_evaluations(file_id, evaluation.id)

            await asyncio.gather(
                *[
                    workflow.execute_activity(
                        workflow_shared_actitivies.UpdateFileStatusActivity.run,
                        args=[
                            file_id,
                            vmxfp_db_models.FileStatus.COMPLETED,
                        ],
                        start_to_close_timeout=DEFAULT_TIMEOUT,
                        retry_policy=DEFAULT_RETRY_POLICY,
                    )
                    for file_id in files_to_evaluate
                ]
            )
        except Exception as e:
            raise ApplicationError(f"Error in evaluation update workflow: {e}") from e

    async def process_evaluations(
        self,
        file_id: UUID,
        evaluation_id: UUID,
        parent_evaluation_id: Optional[UUID] = None,
        parent_evaluation_option: Optional[str] = None,
    ):
        logger.info(
            f"Processing evaluations for file {file_id}, "
            f"evaluation_id: {evaluation_id}, "
            f"parent_evaluation_id: {parent_evaluation_id}, "
            f"parent_evaluation_option: {parent_evaluation_option}"
        )
        evaluations_results: list[tuple[UUID, str]] = []
        evaluation_output = await workflow.execute_activity(
            activities.StartEvaluationsActivity.run,
            args=[
                file_id,
                evaluation_id,
                parent_evaluation_id,
                parent_evaluation_option,
            ],
            start_to_close_timeout=DEFAULT_TIMEOUT,
            retry_policy=DEFAULT_RETRY_POLICY,
        )

        if not evaluation_output.batch_item_ids:
            return

        @workflow.signal
        async def evaluate_item(result: CompletionBatchItemUpdateCallbackPayload):
            evaluation_id = UUID(result.payload.request.metadata["evaluation_id"])
            file_content_id = UUID(result.payload.request.metadata["file_content_id"])

            response_value = await workflow.execute_activity(
                activities.StoreEvaluationActivity.run,
                args=[file_id, evaluation_id, file_content_id, result],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            evaluations_results.append((evaluation_id, response_value))

        workflow.set_signal_handler("evaluate_item", evaluate_item)

        # # Wait for all evaluations
        await workflow.wait_condition(
            lambda: len(evaluations_results) == len(evaluation_output.batch_item_ids)
        )

        for parent_evaluation_id, response_value in evaluations_results:
            evaluation_key = f"{parent_evaluation_id}-{response_value}"

            if evaluation_key in self.evaluations_map:
                continue

            await self.process_evaluations(
                file_id,
                evaluation_id,
                parent_evaluation_id,
                response_value,
            )
            self.evaluations_map[evaluation_key] = evaluation_id
