import workflow_shared_actitivies
from dependency_injector import providers
from internal_db_repositories.containers import RepositoriesContainer
from internal_services.containers import ServicesContainer
from internal_vmx_utils.containers import VMXContainer

from evaluation_workflow.activities.get_files_to_evaluate import (
    GetFilesToEvaluateActivity,
)
from evaluation_workflow.activities.start_evaluations import StartEvaluationsActivity
from evaluation_workflow.activities.store_evaluation import StoreEvaluationActivity
from evaluation_workflow.lambda_functions.settings import Settings


class LambdaContainer(RepositoriesContainer, ServicesContainer, VMXContainer):
    settings = providers.Singleton(Settings)

    start_evaluations_activity = providers.Singleton(
        StartEvaluationsActivity,
        evaluation_service=ServicesContainer.evaluation_service,
        file_repository=RepositoriesContainer.file_repository,
        file_content_repository=RepositoriesContainer.file_content_repository,
        vmx_client_resource=VMXContainer.vmx_client,
        ingestion_callback_url=settings.provided.ingestion_callback.url,
    )

    store_evaluation_activity = providers.Singleton(
        StoreEvaluationActivity,
        file_repository=RepositoriesContainer.file_repository,
        evaluation_repository=RepositoriesContainer.evaluation_repository,
        file_evaluation_repository=RepositoriesContainer.file_evaluation_repository,
    )

    get_files_to_evaluate_activity = providers.Singleton(
        GetFilesToEvaluateActivity,
        file_evaluation_repository=RepositoriesContainer.file_evaluation_repository,
        file_repository=RepositoriesContainer.file_repository,
    )

    update_file_status_activity = providers.Singleton(
        workflow_shared_actitivies.UpdateFileStatusActivity,
        file_repository=RepositoriesContainer.file_repository,
    )
