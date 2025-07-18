import asyncio
import logging
from datetime import timedelta

import internal_db_models
from internal_schemas.s3 import S3Event
from temporalio import workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ApplicationError

with workflow.unsafe.imports_passed_through():
    import workflow_shared_actitivies

    from . import activities


logger = logging.getLogger(__name__)

DEFAULT_RETRY_POLICY = RetryPolicy(maximum_attempts=3)
DEFAULT_TIMEOUT = timedelta(seconds=300)


@workflow.defn(name="IngestionWorkflow")
class IngestionWorkflow:
    @workflow.run
    async def run(self, message: S3Event) -> dict:
        load_output: activities.LoadS3FileOutput | None = None

        try:
            load_output = await workflow.execute_activity(
                activities.LoadS3FileActivity.run,
                args=[message],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            file_chunks = await asyncio.gather(
                *[
                    workflow.execute_activity(
                        activities.ChunkDocumentActivity.run,
                        args=[
                            load_output.file_id,
                            load_output.project_id,
                            file_content_id,
                        ],
                        start_to_close_timeout=DEFAULT_TIMEOUT,
                        retry_policy=DEFAULT_RETRY_POLICY,
                    )
                    for file_content_id in load_output.file_content_ids
                ]
            )

            chunks = [chunk_id for out in file_chunks for chunk_id in out.chunk_ids]

            await asyncio.gather(
                *[
                    workflow.execute_activity(
                        activities.CreateChunkEmbeddingsActivity.run,
                        args=[
                            load_output.file_id,
                            chunk_id,
                            chunk_number + 1,
                        ],
                        start_to_close_timeout=DEFAULT_TIMEOUT,
                        retry_policy=DEFAULT_RETRY_POLICY,
                    )
                    for chunk_number, chunk_id in enumerate(chunks)
                ]
            )

            await workflow.execute_activity(
                workflow_shared_actitivies.UpdateFileStatusActivity.run,
                args=[
                    load_output.file_id,
                    internal_db_models.FileStatus.COMPLETED,
                ],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            await workflow.execute_activity(
                workflow_shared_actitivies.SendEventActivity.run,
                args=[
                    "ingestion",
                    "file_ingested_successfully",
                    {"file_id": load_output.file_id},
                ],
                start_to_close_timeout=DEFAULT_TIMEOUT,
                retry_policy=DEFAULT_RETRY_POLICY,
            )

            return load_output.file_id
        except Exception as e:
            error_msg = f"Error in ingestion workflow: {e}"
            workflow.logger.error(error_msg)
            if load_output.file_id:
                await workflow.execute_activity(
                    workflow_shared_actitivies.UpdateFileStatusActivity.run,
                    args=[
                        load_output.file_id,
                        internal_db_models.FileStatus.FAILED,
                    ],
                    start_to_close_timeout=DEFAULT_TIMEOUT,
                    retry_policy=DEFAULT_RETRY_POLICY,
                )

                await workflow.execute_activity(
                    workflow_shared_actitivies.SendEventActivity.run,
                    args=[
                        "ingestion",
                        "file_ingestion_failed",
                        {
                            "file_id": load_output.file_id,
                            "error": str(e),
                        },
                    ],
                    start_to_close_timeout=DEFAULT_TIMEOUT,
                    retry_policy=DEFAULT_RETRY_POLICY,
                )

            raise ApplicationError(error_msg) from e
