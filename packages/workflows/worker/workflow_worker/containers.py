import evaluation_workflow.activities.temporal as evaluation_activities
import ingestion_workflow.activities.temporal as ingestion_activities
import workflow_shared_actitivies.temporal as workflow_shared_actitivies
from dependency_injector import providers
from internal_aws_shared.containers import AWSContainer
from internal_db_repositories.containers import RepositoriesContainer
from internal_services.containers import ServicesContainer
from internal_temporal_utils.containers import TemporalContainer
from internal_vmx_utils.containers import VMXContainer

from workflow_worker.settings import Settings


class Container(
    RepositoriesContainer, ServicesContainer, TemporalContainer, VMXContainer
):
    settings = providers.Singleton(Settings)

    activities = providers.List(
        providers.Singleton(
            ingestion_activities.LoadS3FileActivityTemporal,
            file_repository=RepositoriesContainer.file_repository,
            project_repository=RepositoriesContainer.project_repository,
            file_content_repository=RepositoriesContainer.file_content_repository,
            aioboto3_session=AWSContainer.aioboto3_session,
            thumbnail_s3_bucket_name=settings.provided.thumbnail.s3_bucket_name,
        ),
        providers.Singleton(
            ingestion_activities.ChunkDocumentActivityTemporal,
            file_repository=RepositoriesContainer.file_repository,
            file_content_repository=RepositoriesContainer.file_content_repository,
            file_embedding_repository=RepositoriesContainer.file_embedding_repository,
        ),
        providers.Singleton(
            ingestion_activities.CreateChunkEmbeddingsActivityTemporal,
            file_embedding_repository=RepositoriesContainer.file_embedding_repository,
            file_repository=RepositoriesContainer.file_repository,
            openai_api_key=ServicesContainer.openai_key,
        ),
        providers.Singleton(
            evaluation_activities.StartEvaluationsActivityTemporal,
            evaluation_service=ServicesContainer.evaluation_service,
            file_repository=RepositoriesContainer.file_repository,
            file_content_repository=RepositoriesContainer.file_content_repository,
            vmx_client_resource=VMXContainer.vmx_client,
            ingestion_callback_url=settings.provided.ingestion_callback.url,
        ),
        providers.Singleton(
            evaluation_activities.StoreEvaluationActivityTemporal,
            file_repository=RepositoriesContainer.file_repository,
            evaluation_repository=RepositoriesContainer.evaluation_repository,
            file_evaluation_repository=RepositoriesContainer.file_evaluation_repository,
        ),
        providers.Singleton(
            workflow_shared_actitivies.UpdateFileStatusActivityTemporal,
            file_repository=RepositoriesContainer.file_repository,
        ),
        providers.Singleton(
            workflow_shared_actitivies.SendEventActivityTemporal,
            aioboto3_session=AWSContainer.aioboto3_session,
            event_bus_name=settings.provided.event_bus_name,
        ),
        providers.Singleton(
            evaluation_activities.GetFilesToEvaluateActivityTemporal,
            file_evaluation_repository=RepositoriesContainer.file_evaluation_repository,
            file_repository=RepositoriesContainer.file_repository,
        ),
    )
