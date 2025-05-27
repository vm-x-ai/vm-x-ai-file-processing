import asyncio
import logging

from temporalio.client import Client
from temporalio.worker import Worker

from ingestion_workflow.activities import (
    chunk_document,
    create_chunk_embeddings,
    get_files_to_evaluate,
    load_s3_file,
    start_evaluations,
    store_evaluation,
    update_file_status,
)
from ingestion_workflow.containers import Container
from ingestion_workflow.workflow import IngestionWorkflow, UpdateEvaluationWorkflow

logger = logging.getLogger(__name__)


async def main():
    container = Container()
    container.wire(modules=["ingestion_workflow.activities"])
    await container.init_resources()
    client: Client = await container.temporal_client()
    logger.info(f"Starting worker for {client.namespace}")

    worker = Worker(
        client,
        task_queue="ingestion-workflow",
        workflows=[IngestionWorkflow, UpdateEvaluationWorkflow],
        activities=[
            load_s3_file,
            chunk_document,
            create_chunk_embeddings,
            start_evaluations,
            store_evaluation,
            update_file_status,
            get_files_to_evaluate,
        ],
    )
    await worker.run()

    await container.shutdown_resources()


if __name__ == "__main__":
    asyncio.run(main())
