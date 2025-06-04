from temporalio.client import Client

from .pydantic_converter import pydantic_data_converter


async def init_temporal_client(host: str):
    client = await Client.connect(
        host,
        data_converter=pydantic_data_converter,
    )
    yield client
