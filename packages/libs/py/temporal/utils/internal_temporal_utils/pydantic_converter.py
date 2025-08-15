import logging
from typing import Any

import temporalio.api.common.v1
from pydantic import TypeAdapter
from pydantic_core import to_json
from temporalio.converter import (
    CompositePayloadConverter,
    DataConverter,
    DefaultPayloadConverter,
    EncodingPayloadConverter,
    JSONPlainPayloadConverter,
)

logger = logging.getLogger(__name__)


class PydanticJSONPlainPayloadConverter(EncodingPayloadConverter):
    """Pydantic JSON payload converter.

    Supports conversion of all types supported by Pydantic to and from JSON.

    In addition to Pydantic models, these include all `json.dump`-able types,
    various non-`json.dump`-able standard library types such as dataclasses,
    types from the datetime module, sets, UUID, etc, and custom types composed
    of any of these.

    See https://docs.pydantic.dev/latest/api/standard_library_types/
    """

    @property
    def encoding(self) -> str:
        """See base class."""
        return "json/plain"

    def to_payload(self, value: Any) -> temporalio.api.common.v1.Payload | None:
        """See base class.

        Uses ``pydantic_core.to_json`` to serialize ``value`` to JSON.

        See
        https://docs.pydantic.dev/latest/api/pydantic_core/#pydantic_core.to_json.
        """
        return temporalio.api.common.v1.Payload(
            metadata={"encoding": self.encoding.encode()},
            data=to_json(value, by_alias=True),
        )

    def from_payload(
        self,
        payload: temporalio.api.common.v1.Payload,
        type_hint: type | None = None,
    ) -> Any:
        """See base class.

        Uses ``pydantic.TypeAdapter.validate_json`` to construct an
        instance of the type specified by ``type_hint`` from the JSON payload.

        See
        https://docs.pydantic.dev/latest/api/type_adapter/#pydantic.type_adapter.TypeAdapter.validate_json.
        """
        _type_hint = type_hint if type_hint is not None else Any
        return TypeAdapter(_type_hint).validate_json(payload.data, by_alias=True)


class PydanticPayloadConverter(CompositePayloadConverter):
    """Payload converter for payloads containing pydantic model instances.

    JSON conversion is replaced with a converter that uses
    :py:class:`PydanticJSONPlainPayloadConverter`.
    """

    def __init__(self) -> None:
        """Initialize object"""
        json_payload_converter = PydanticJSONPlainPayloadConverter()
        super().__init__(
            *(
                c
                if not isinstance(c, JSONPlainPayloadConverter)
                else json_payload_converter
                for c in DefaultPayloadConverter.default_encoding_payload_converters
            )
        )


pydantic_data_converter = DataConverter(
    payload_converter_class=PydanticPayloadConverter
)
