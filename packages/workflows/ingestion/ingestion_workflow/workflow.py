import asyncio
import logging
from datetime import timedelta
from typing import Optional
from uuid import UUID

from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError

from ingestion_workflow import models
from ingestion_workflow.schema.s3 import S3Event

with workflow.unsafe.imports_passed_through():
    from vmxai.types import CompletionBatchItemUpdateCallbackPayload

    from ingestion_workflow import activities


logger = logging.getLogger(__name__)

DEFAULT_RETRY_POLICY = RetryPolicy(maximum_attempts=3)


@workflow.defn
class IngestionWorkflow:
    @workflow.run
    async def run(self, message: S3Event) -> dict:
        try:
            docs = await workflow.execute_activity(
                activities.load_s3_file,
                message,
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            doc_chunks = await asyncio.gather(
                *[
                    workflow.execute_activity(
                        activities.chunk_document,
                        args=[docs.file, doc],
                        start_to_close_timeout=timedelta(seconds=60),
                        retry_policy=DEFAULT_RETRY_POLICY,
                    )
                    for doc in docs.docs
                ]
            )

            chunks = [chunk for doc in doc_chunks for chunk in doc]

            await asyncio.gather(
                *[
                    workflow.execute_activity(
                        activities.create_chunk_embeddings,
                        args=[docs.file, chunk_number + 1, chunk],
                        start_to_close_timeout=timedelta(seconds=60),
                        retry_policy=DEFAULT_RETRY_POLICY,
                    )
                    for chunk_number, chunk in enumerate(chunks)
                ]
            )

            await workflow.execute_activity(
                activities.update_file_status,
                args=[docs.file, models.FileStatus.COMPLETED],
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            self.evaluations_map = {}
            await self.process_evaluations(docs)

            await workflow.execute_activity(
                activities.update_file_status,
                args=[docs.file, models.FileStatus.COMPLETED],
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            return docs.file
        except Exception as e:
            error_msg = f"Error in ingestion workflow: {e}"
            workflow.logger.error(error_msg)
            raise ApplicationError(error_msg) from e

    async def process_evaluations(
        self,
        load_output: activities.LoadS3FileOutput,
        parent_evaluation_id: Optional[UUID] = None,
        parent_evaluation_option: Optional[str] = None,
    ):
        logger.info(
            f"Processing evaluations for file {load_output.file.id}, "
            f"parent_evaluation_id: {parent_evaluation_id}, "
            f"parent_evaluation_option: {parent_evaluation_option}"
        )
        evaluations_results = []
        evaluation_output = await workflow.execute_activity(
            activities.start_evaluations,
            args=[
                load_output.file,
                load_output.docs,
                parent_evaluation_id,
                parent_evaluation_option,
            ],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=DEFAULT_RETRY_POLICY,
        )

        if not evaluation_output.batch_response:
            return

        @workflow.signal
        async def evaluate_item(result: CompletionBatchItemUpdateCallbackPayload):
            evaluation_id = UUID(result.payload.request.metadata["evaluation_id"])
            evaluation_item = evaluation_output.evaluations[evaluation_id]

            response_value = await workflow.execute_activity(
                activities.store_evaluation,
                args=[load_output.file, evaluation_item, result],
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            evaluations_results.append((evaluation_item, response_value))

        workflow.set_signal_handler("evaluate_item", evaluate_item)

        # # Wait for all evaluations
        await workflow.wait_condition(
            lambda: len(evaluations_results)
            == len(evaluation_output.batch_response.items)
        )

        for evaluation, response_value in evaluations_results:
            evaluation_key = f"{evaluation.id}-{response_value}"

            if evaluation_key in self.evaluations_map:
                continue

            await self.process_evaluations(
                load_output,
                evaluation.id,
                response_value,
            )
            self.evaluations_map[evaluation_key] = evaluation
