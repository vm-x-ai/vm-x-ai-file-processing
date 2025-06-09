import aioboto3
import evaluation_workflow.activities as evaluation_activities
import ingestion_workflow.activities as ingestion_activities
import workflow_shared_actitivies
from dependency_injector import providers
from dm_db_repositories.containers import RepositoriesContainer
from dm_services.containers import ServicesContainer
from dm_temporal_utils.containers import TemporalContainer
from vmxai import VMXClient

from workflow_worker.settings import Settings


class Container(RepositoriesContainer, ServicesContainer, TemporalContainer):
    settings = providers.Singleton(Settings)

    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )

    vmx_client = providers.Factory(
        VMXClient,
        domain=settings.provided.vmx.domain,
        api_key=settings.provided.vmx.api_key,
        workspace_id=settings.provided.vmx.workspace_id,
        environment_id=settings.provided.vmx.environment_id,
    )

    activities = providers.List(
        providers.Factory(
            ingestion_activities.LoadS3FileActivity,
            file_repository=RepositoriesContainer.file_repository,
            project_repository=RepositoriesContainer.project_repository,
            file_content_repository=RepositoriesContainer.file_content_repository,
            aioboto3_session=aioboto3_session,
            thumbnail_s3_bucket_name=settings.provided.thumbnail.s3_bucket_name,
        ),
        providers.Factory(
            ingestion_activities.ChunkDocumentActivity,
            file_repository=RepositoriesContainer.file_repository,
            file_content_repository=RepositoriesContainer.file_content_repository,
            file_embedding_repository=RepositoriesContainer.file_embedding_repository,
        ),
        providers.Factory(
            ingestion_activities.CreateChunkEmbeddingsActivity,
            file_embedding_repository=RepositoriesContainer.file_embedding_repository,
            file_repository=RepositoriesContainer.file_repository,
            openai_api_key=settings.provided.openai.api_key,
        ),
        providers.Factory(
            evaluation_activities.StartEvaluationsActivity,
            evaluation_service=ServicesContainer.evaluation_service,
            file_repository=RepositoriesContainer.file_repository,
            file_content_repository=RepositoriesContainer.file_content_repository,
            vmx_client=vmx_client,
            vmx_resource_id=settings.provided.vmx.resource_id,
            ingestion_callback_url=settings.provided.ingestion_callback.url,
        ),
        providers.Factory(
            evaluation_activities.StoreEvaluationActivity,
            file_repository=RepositoriesContainer.file_repository,
            evaluation_repository=RepositoriesContainer.evaluation_repository,
            file_evaluation_repository=RepositoriesContainer.file_evaluation_repository,
        ),
        providers.Factory(
            workflow_shared_actitivies.UpdateFileStatusActivity,
            file_repository=RepositoriesContainer.file_repository,
        ),
        providers.Factory(
            workflow_shared_actitivies.SendEventActivity,
            aioboto3_session=aioboto3_session,
            event_bus_name=settings.provided.event_bus_name,
        ),
        providers.Factory(
            evaluation_activities.GetFilesToEvaluateActivity,
            file_evaluation_repository=RepositoriesContainer.file_evaluation_repository,
            file_repository=RepositoriesContainer.file_repository,
        ),
    )
