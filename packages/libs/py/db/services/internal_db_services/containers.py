import aioboto3
from dependency_injector import containers, providers
from internal_db_models.settings import DatabaseSettings

from internal_db_services import Database


class DatabaseContainer(containers.DeclarativeContainer):
    db_settings = providers.Singleton(DatabaseSettings)

    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )

    db = providers.Resource(
        Database,
        aioboto3_session=aioboto3_session,
        db_settings=db_settings,
    )
