import aioboto3
from dependency_injector import providers
from vmxfp_db_repositories.containers import RepositoriesContainer
from vmxfp_services.containers import ServicesContainer
from vmxfp_temporal_utils.containers import TemporalContainer

from api.settings import Settings


class Container(RepositoriesContainer, ServicesContainer, TemporalContainer):
    settings = providers.Singleton(Settings)

    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )
