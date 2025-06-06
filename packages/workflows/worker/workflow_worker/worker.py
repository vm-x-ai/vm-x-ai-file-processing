import asyncio
import logging

from evaluation_workflow.workflow import EvaluationWorkflow, UpdateEvaluationWorkflow
from ingestion_workflow.workflow import IngestionWorkflow
from temporalio.client import Client
from temporalio.worker import Worker

from workflow_worker.containers import Container

logger = logging.getLogger(__name__)


async def main():
    container = Container()
    await container.init_resources()
    client: Client = await container.temporal_client()
    logger.info(f"Starting worker for {client.namespace}")

    activities = container.activities()

    worker = Worker(
        client,
        task_queue="ingestion-workflow",
        workflows=[IngestionWorkflow, EvaluationWorkflow, UpdateEvaluationWorkflow],
        activities=[activity.run for activity in activities],
    )

    await worker.run()

    await container.shutdown_resources()


if __name__ == "__main__":

    asyncio.run(main())
