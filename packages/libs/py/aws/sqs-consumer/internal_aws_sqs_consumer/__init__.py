import asyncio
import logging
from abc import ABC, abstractmethod
from collections.abc import Awaitable, Callable
from concurrent.futures import ThreadPoolExecutor

import aioboto3

from .event import SQSEventService, SQSEventType
from .settings import SQSConsumerSettings


class BaseMessageHandler(ABC):
    """Abstract base class for SQS message handlers.

    Provides base functionality for handling SQS messages including logging \
        and message deletion.

    Args:
        queue_url: URL of the SQS queue
        event_service: Service for handling events

    Attributes:
        _logger: Logger instance
        _queue_url: URL of the SQS queue
        _aioboto3_session: aioboto3 session
    """

    def __init__(
        self,
        queue_url: str,
        aioboto3_session: aioboto3.Session,
    ):
        self._logger = logging.getLogger(__name__)
        self._queue_url = queue_url
        self._aioboto3_session = aioboto3_session

    @abstractmethod
    async def _handle(self, message: dict):
        """Abstract method to handle a specific message.

        Args:
            message: The SQS message to handle
        """
        pass

    async def handle(self, message: dict):
        """Handles an SQS message including logging and cleanup.

        Args:
            message: The SQS message to handle

        Raises:
            Exception: If message handling fails
        """
        try:
            self._logger.info(
                "Processing message",
                extra={"sqs_message": message},
            )

            await self._handle(message)

            self._logger.info(
                "Message processed successfully",
                extra={"message_id": message["MessageId"]},
            )

            async with self._aioboto3_session.client("sqs") as sqs:
                await sqs.delete_message(
                    QueueUrl=self._queue_url,
                    ReceiptHandle=message["ReceiptHandle"],
                )
        except Exception as error:
            self._logger.error(
                f"Error handling message: {error}",
                exc_info=True,
            )


class SQSConsumer:
    """Consumer for processing messages from an SQS queue.

    Continuously polls an SQS queue and processes messages using the provided handler.

    Args:
        sqs_consumer_settings: Settings for the SQS consumer
        message_handler: Handler for processing messages
        event_service: Service for handling events

    Attributes:
        _logger: Logger instance
        _queue_url: URL of the SQS queue
        _aioboto3_session: aioboto3.Session
        _max_number_of_messages: Maximum number of messages to receive at once
        _visibility_timeout: Visibility timeout for messages
        _number_of_concurrent_tasks: Maximum number of concurrent tasks
        _wait_time_seconds: Wait time between polling attempts
        _event_service: Event service instance
        _stopped: Flag indicating if consumer should stop
    """

    def __init__(
        self,
        sqs_consumer_settings: SQSConsumerSettings,
        message_handler: Callable[[dict], Awaitable[None]],
        aioboto3_session: aioboto3.Session,
        event_service: SQSEventService | None = None,
    ):
        self._logger = logging.getLogger(__name__)
        self._queue_url = sqs_consumer_settings.queue_url
        self._aioboto3_session = aioboto3_session
        self._max_number_of_messages = sqs_consumer_settings.max_number_of_messages
        self._visibility_timeout = sqs_consumer_settings.visibility_timeout
        self._number_of_concurrent_tasks = (
            sqs_consumer_settings.number_of_concurrent_tasks
        )
        self._wait_time_seconds = sqs_consumer_settings.wait_time_seconds

        self._event_service = event_service or SQSEventService()
        self._event_service.subscribe_event(
            SQSEventType.INCOMING_MESSAGE,
            message_handler,
        )
        self._stopped = False

    async def run(self):
        """Runs the SQS consumer.

        Continuously polls the SQS queue and processes messages until stopped.
        """
        self._logger.info(
            "Starting SQS consumer",
            extra={
                "queue_url": self._queue_url,
                "max_number_of_messages": self._max_number_of_messages,
                "visibility_timeout": self._visibility_timeout,
            },
        )
        with ThreadPoolExecutor(
            max_workers=self._number_of_concurrent_tasks
        ) as executor:
            while True:
                if self._stopped:
                    break

                messages = await self._get_messages()

                if "Messages" not in messages:
                    self._logger.debug("No messages found in queue")
                    await asyncio.sleep(self._wait_time_seconds)
                    continue

                self._logger.info(
                    "Received messages",
                    extra={
                        "number_of_messages": len(messages["Messages"]),
                    },
                )

                for message in messages["Messages"]:
                    self._event_service.publish_event_deferred(
                        executor,
                        SQSEventType.INCOMING_MESSAGE,
                        message,
                    )

                if (
                    self._event_service.task_queue_length
                    >= self._number_of_concurrent_tasks
                ):
                    self._logger.info(
                        "Waiting for at least one slot to be available",
                        extra={"flush_count": self._event_service.task_queue_length},
                    )
                    await self._event_service.wait_first_deferred_event_buffer()
                    self._logger.info(
                        "Client ready to receive new messages",
                    )

    async def _get_messages(self) -> dict:
        """Retrieves messages from the SQS queue.

        Returns:
            Dict containing the received messages

        Raises:
            Exception: If message retrieval fails
        """
        try:
            pending_messages = self._event_service.task_queue_length
            available_slots = self._number_of_concurrent_tasks - pending_messages
            if available_slots <= 0:
                self._logger.info(
                    "Maximum number of concurrent tasks reached, "
                    "waiting for tasks to complete"
                )
                return {}

            async with self._aioboto3_session.client("sqs") as sqs:
                messages = await sqs.receive_message(
                    QueueUrl=self._queue_url,
                    MaxNumberOfMessages=min(
                        self._max_number_of_messages, available_slots
                    ),
                    VisibilityTimeout=self._visibility_timeout,
                )

                return messages
        except Exception as error:
            self._logger.error(
                "Error receiving messages, "
                "flushing deferred event buffer and stopping consumer",
                exc_info=True,
            )

            await self._event_service.flush_deferred_event_buffer()
            raise error

    async def stop(self):
        """Stops the SQS consumer.

        Flushes any remaining messages and stops polling.
        """
        self._stopped = True
        await self._event_service.flush_deferred_event_buffer()
