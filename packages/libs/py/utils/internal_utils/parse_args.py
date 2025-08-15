import inspect
from collections.abc import Callable
from types import UnionType
from typing import get_args, get_origin

from pydantic import BaseModel


def parse_args(callable: Callable, raw_args: dict):
    parsed_args = {}
    for param_name, param_type in inspect.signature(callable).parameters.items():
        if param_name not in raw_args:
            raise ValueError(f"Missing argument: {param_name}")

        parsed_args[param_name] = _parse_param(
            raw_args, param_name, param_type.annotation
        )

    return parsed_args


def _parse_param(
    raw_args: dict,
    param_name: str,
    annotation: type | None,
) -> None:
    if raw_args[param_name] is None or annotation is None:
        return

    if issubclass(annotation, BaseModel):
        return annotation.model_validate(raw_args[param_name])
    elif get_origin(annotation) is UnionType:
        for arg in get_args(annotation):
            try:
                return _parse_param(raw_args, param_name, arg)
            except Exception:
                continue

        raise ValueError(f"Invalid argument: {param_name}")
    else:
        return annotation(raw_args[param_name])
