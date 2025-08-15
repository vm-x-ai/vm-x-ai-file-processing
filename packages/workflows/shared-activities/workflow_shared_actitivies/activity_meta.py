import functools
from abc import ABCMeta
from typing import TypeVar

ActivityType = TypeVar("ActivityType")


class TemporalActivityMeta(ABCMeta):
    def __new__(mcs, name, bases, namespace, **kwargs):
        from temporalio import activity

        original_run = bases[0].run

        @activity.defn(name=bases[0].__name__)
        @functools.wraps(original_run)
        async def _wrapper(self, *args, **kwargs):
            return await original_run(self, *args, **kwargs)

        namespace["run"] = _wrapper

        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        return cls
