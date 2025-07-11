from dependency_injector import containers, providers

from .client import init_temporal_client
from .settings import TemporalSettings


class TemporalContainer(containers.DeclarativeContainer):
    temporal_settings = providers.Singleton(TemporalSettings)

    temporal_client = providers.Resource(
        init_temporal_client,
        host=temporal_settings.provided.host,
    )
