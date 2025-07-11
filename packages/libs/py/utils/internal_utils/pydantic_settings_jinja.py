from functools import wraps
from os import environ

from jinja2 import Environment
from pydantic import field_validator


def jinja_template_validator(*field_names: str, additional_params: dict | None = None):
    """
    A decorator factory that creates a field validator for Jinja template resolution.

    Args:
        *field_names: Variable number of field names to apply the validator to

    Returns:
        A decorator that can be applied to a validator method
    """

    def decorator(func):
        @wraps(func)
        def wrapper(cls, value):
            if value and isinstance(value, str):
                params = {**environ, **(additional_params or {})}
                return Environment().from_string(value).render(**params)
            return value

        # Apply the field_validator decorator with the specified field names
        return field_validator(*field_names, mode="before")(wrapper)

    return decorator
