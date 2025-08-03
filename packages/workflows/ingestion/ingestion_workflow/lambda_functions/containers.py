from dependency_injector import providers
from internal_db_repositories.containers import RepositoriesContainer
from internal_services.containers import ServicesContainer

from ingestion_workflow import activities
from ingestion_workflow.lambda_functions.settings import Settings


class LambdaContainer(RepositoriesContainer, ServicesContainer):
    settings = providers.Singleton(Settings)

    load_s3_file_activity = providers.Singleton(
        activities.LoadS3FileActivity,
        file_repository=RepositoriesContainer.file_repository,
        project_repository=RepositoriesContainer.project_repository,
        file_content_repository=RepositoriesContainer.file_content_repository,
        aioboto3_session=ServicesContainer.aioboto3_session,
        thumbnail_s3_bucket_name=settings.provided.thumbnail.s3_bucket_name,
    )
