from dependency_injector import containers, providers
from internal_db_models.settings import DatabaseSettings

from internal_db_services import Database


class DatabaseContainer(containers.DeclarativeContainer):
    db_settings = providers.Singleton(DatabaseSettings)

    db = providers.Singleton(
        Database,
        db_url=db_settings.provided.url,
        db_ro_url=db_settings.provided.ro_url,
    )
