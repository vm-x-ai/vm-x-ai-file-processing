from dependency_injector import providers
from internal_aws_shared.containers import AWSContainer
from internal_db_repositories.containers import RepositoriesContainer

from internal_services.openai_key import OpenAIKeyResource
from internal_services.workflow.engine import WorkflowEngineService

from .evaluation import EvaluationService
from .settings import Settings


class ServicesContainer(AWSContainer):
    service_settings = providers.Singleton(Settings)

    openai_key = providers.Resource(
        OpenAIKeyResource,
        aioboto3_session=AWSContainer.aioboto3_session,
        openai_settings=service_settings.provided.openai,
    )

    evaluation_service = providers.Singleton(
        EvaluationService,
        evaluation_repository=RepositoriesContainer.evaluation_repository,
        evaluation_template_repository=RepositoriesContainer.evaluation_template_repository,
    )

    workflow_engine_service = providers.Singleton(
        WorkflowEngineService,
        aioboto3_session=AWSContainer.aioboto3_session,
        workflow_engine=service_settings.provided.workflow_engine,
    )
