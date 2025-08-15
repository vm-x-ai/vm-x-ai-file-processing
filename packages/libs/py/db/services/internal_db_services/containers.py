from dependency_injector import providers
from internal_aws_shared.containers import AWSContainer
from internal_db_models.settings import DatabaseSettings

from internal_db_services import Database


class DatabaseContainer(AWSContainer):
    db_settings = providers.Singleton(DatabaseSettings)

    db = providers.Resource(
        Database,
        aioboto3_session=AWSContainer.aioboto3_session,
        db_settings=db_settings,
    )
