import aioboto3
from dependency_injector import containers, providers


class AWSContainer(containers.DeclarativeContainer):
    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )
