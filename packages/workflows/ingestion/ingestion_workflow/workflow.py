import asyncio
from datetime import timedelta
from typing import cast

from temporalio import workflow

from ingestion_workflow import models
from ingestion_workflow.schema.s3 import S3Event

with workflow.unsafe.imports_passed_through():
    from vmxai.types import CompletionBatchItemUpdateCallbackPayload

    from .activities import (
        chunk_document,
        create_chunk_embeddings,
        load_s3_file,
        start_evaluations,
        store_evaluation,
        update_file_status,
    )


@workflow.defn
class IngestionWorkflow:
    @workflow.run
    async def run(self, message: S3Event) -> dict:
        docs = await workflow.execute_activity(
            load_s3_file,
            message,
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=None,
        )

        doc_chunks = await asyncio.gather(
            *[
                workflow.execute_activity(
                    chunk_document,
                    args=[docs.file, doc],
                    start_to_close_timeout=timedelta(seconds=60),
                    retry_policy=None,
                )
                for doc in docs.docs
            ]
        )

        chunks = [chunk for doc in doc_chunks for chunk in doc]

        await asyncio.gather(
            *[
                workflow.execute_activity(
                    create_chunk_embeddings,
                    args=[docs.file, chunk_number + 1, chunk],
                    start_to_close_timeout=timedelta(seconds=60),
                    retry_policy=None,
                )
                for chunk_number, chunk in enumerate(chunks)
            ]
        )

        evaluations = await workflow.execute_activity(
            start_evaluations,
            args=[docs.file, docs.docs],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=None,
        )

        evaluations_results = []

        # # Set up signal handler
        @workflow.signal
        async def evaluate_item(payload: CompletionBatchItemUpdateCallbackPayload):
            await workflow.execute_activity(
                store_evaluation,
                args=[docs.file, payload],
                start_to_close_timeout=timedelta(seconds=60),
                retry_policy=None,
            )

            evaluations_results.append(payload.payload)

        workflow.set_signal_handler("evaluate_item", evaluate_item)

        # # Wait for all evaluations
        await workflow.wait_condition(
            lambda: len(evaluations_results) == len(cast(dict, evaluations)["items"])
        )

        await workflow.execute_activity(
            update_file_status,
            args=[docs.file, models.FileStatus.COMPLETED],
            start_to_close_timeout=timedelta(seconds=60),
            retry_policy=None,
        )

        return docs.file
