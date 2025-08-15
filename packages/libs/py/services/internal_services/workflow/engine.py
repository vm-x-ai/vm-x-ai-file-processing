import logging
from abc import ABC, ABCMeta, abstractmethod
from typing import Literal

import aioboto3
from pydantic import BaseModel
from vmxai.types import CompletionBatchItemUpdateCallbackPayload


class AsyncDelegateMeta(ABCMeta):
    def __new__(mcs, name, bases, namespace, **kwargs):
        abstract_methods = set()
        for base in bases:
            abstract_methods.update(getattr(base, "__abstractmethods__", []))

        for method_name in abstract_methods:
            # Skip if method is already implemented
            if method_name in namespace:
                continue

            async def proxy(self, *args, _method=method_name, **kwargs):
                delegate = await self._get_delegate_async()
                return await getattr(delegate, _method)(*args, **kwargs)

            namespace[method_name] = proxy

        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        return cls


class BaseWorkflowEngineService(ABC, metaclass=AsyncDelegateMeta):
    def __init__(self):
        self._logger = logging.getLogger(__name__)

    @abstractmethod
    async def start_workflow(
        self, workflow_name: str, id: str, payload: dict | BaseModel
    ): ...

    @abstractmethod
    async def receive_batch_item_update_callback(
        self,
        query_params: dict[str, str],
        payload: CompletionBatchItemUpdateCallbackPayload,
    ): ...


class WorkflowEngineService(BaseWorkflowEngineService):
    _engines: dict[Literal["temporal", "step_functions"], BaseWorkflowEngineService]

    def __init__(
        self,
        aioboto3_session: aioboto3.Session,
        workflow_engine: Literal["temporal", "step_functions"],
    ):
        super().__init__()
        self._engines = {}
        self._workflow_engine = workflow_engine
        self._aioboto3_session = aioboto3_session

    async def _get_delegate_async(self):
        return await self._get_engine(self._workflow_engine)

    async def _get_engine(
        self, workflow_engine: Literal["temporal", "step_functions"]
    ) -> BaseWorkflowEngineService:
        self._logger.info(f"Getting engine {workflow_engine}")
        if workflow_engine in self._engines:
            return self._engines[workflow_engine]

        if workflow_engine == "temporal":
            from internal_temporal_utils.containers import TemporalContainer

            from internal_services.workflow.temporal import TemporalWorkflowService

            temporal_container = TemporalContainer()
            await temporal_container.init_resources()

            engine = TemporalWorkflowService(await temporal_container.temporal_client())
        elif workflow_engine == "step_functions":
            from internal_services.workflow.step_functions import (
                StepFunctionsWorkflowService,
            )

            engine = StepFunctionsWorkflowService(
                aioboto3_session=self._aioboto3_session,
            )

        return engine
