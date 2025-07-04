import asyncio
import json

import aioboto3
from dependency_injector.wiring import Provide, inject
from temporalio.client import Client
from vmxfp_aws_sqs_consumer import BaseMessageHandler, SQSConsumer
from vmxfp_logger import setup_logger

from .containers import Container

setup_logger()


class IncomingMessageHandler(BaseMessageHandler):
    @inject
    def __init__(
        self,
        queue_url: str,
        temporal_client: Client,
        aioboto3_session: aioboto3.Session = Provide[Container.aioboto3_session],
    ):
        super().__init__(queue_url, aioboto3_session)

        self._temporal_client = temporal_client

    async def _handle(self, message: dict):
        self._logger.info(f"Received message: {message}")

        message_body = message["Body"]
        file_id = json.loads(message_body)["file_id"]

        self._logger.info(f"Starting evaluation workflow for message: {message}")
        asyncio.ensure_future(
            self._temporal_client.start_workflow(
                "EvaluationWorkflow",
                id=f"evaluation-workflow-{message['MessageId']}",
                task_queue="temporal-worker",
                args=[
                    file_id,
                ],
            )
        )

        self._logger.info(f"Evaluation workflow started for message: {message}")


async def main():
    """Main entry point for running the SQS consumer."""
    container = Container()
    await container.init_resources()
    container.wire(modules=[__name__])

    sqs_consumer_settings = container.sqs_consumer_settings()

    handler = IncomingMessageHandler(
        queue_url=sqs_consumer_settings.queue_url,
        temporal_client=await container.temporal_client(),
    )

    consumer = SQSConsumer(
        sqs_consumer_settings=sqs_consumer_settings,
        message_handler=handler.handle,
        aioboto3_session=container.aioboto3_session(),
    )
    await consumer.run()

    await container.shutdown_resources()


if __name__ == "__main__":
    asyncio.run(main())
