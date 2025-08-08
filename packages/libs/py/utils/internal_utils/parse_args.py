import inspect
from typing import Callable

from pydantic import BaseModel


def parse_args(callable: Callable, raw_args: dict):
    parsed_args = {}
    for param_name, param_type in inspect.signature(callable).parameters.items():
        if param_name not in raw_args:
            raise ValueError(f"Missing argument: {param_name}")

        if issubclass(param_type.annotation, BaseModel):
            parsed_args[param_name] = param_type.annotation.model_validate(
                raw_args[param_name]
            )
        else:
            parsed_args[param_name] = param_type.annotation(raw_args[param_name])

    return parsed_args
