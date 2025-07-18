import asyncio
from asyncio import Future
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from enum import Enum
from typing import Any, Callable


class SQSEventType(str, Enum):
    INCOMING_MESSAGE = "INCOMING_MESSAGE"


def _run_coroutine_listener(listener: Callable, *args: Any):
    """
    Runs a coroutine listener

    When using ProcessPoolExecutor, the listener can be pickled directly, \
        when it is not a coroutine.

    When the listener is a coroutine, it needs to run in the event loop synchronously.

    This function is defined outside of the EventService class \
        because of the following limitations:

    1. Local functions cannot be pickled.
    2. Function defined inside a class can be pickled, but ProcessPoolExecutor \
        tries to serialize the class, which in this case is not possible.

    Args:
        listener (Callable): Listener function reference
        *args (Any): Arguments to pass to the listener

    Returns:
        Any: Return value of the listener
    """
    return asyncio.run(listener(*args))


class SQSEventService:
    def __init__(self) -> None:
        self._listeners: dict[str, set[Callable]] = defaultdict(set)
        self._deferred_tasks: set[Future] = set()

    def subscribe_event(self, event_: SQSEventType, callback: Callable):
        """
        Subscribes a callback to an event
        """
        self._listeners[event_].add(callback)

    def unsubscribe_event(self, event_: SQSEventType, callback: Callable):
        """
        Removes a callback to an event
        """
        self._listeners[event_].discard(callback)

    async def publish_event(self, event_: SQSEventType, *args):
        """
        Raises an event on the event service.
        All subscribers will have their callbacks invoked.
        """
        for listener in self._listeners[event_]:
            if asyncio.iscoroutinefunction(listener):
                await listener(*args)
            else:
                listener(*args)

    def publish_event_deferred(
        self,
        executor: ProcessPoolExecutor | ThreadPoolExecutor,
        event_: SQSEventType,
        *args,
    ):
        """
        Deferred version of publish event - cam be called outside async.
        Messages sent using this function may not fire immediately.
        It is recommended to call flush_deferred_message_buffer when finished.
        """
        loop = asyncio.get_running_loop()

        for listener in self._listeners[event_]:
            task = (
                loop.run_in_executor(executor, _run_coroutine_listener, listener, *args)
                if asyncio.iscoroutinefunction(listener)
                else loop.run_in_executor(executor, listener, *args)
            )

            self._deferred_tasks.add(task)
            task.add_done_callback(self._deferred_tasks.discard)

    async def flush_deferred_event_buffer(self):
        """
        Waits for all deferred events to finish.
        """
        await asyncio.gather(*self._deferred_tasks)

    async def wait_first_deferred_event_buffer(self):
        """
        Waits for the first deferred event to finish.
        """
        await asyncio.wait(self._deferred_tasks, return_when=asyncio.FIRST_COMPLETED)

    @property
    def task_queue_length(self):
        return len(self._deferred_tasks)
