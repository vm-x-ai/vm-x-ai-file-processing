import aioboto3
from dependency_injector import containers, providers
from internal_db_repositories.containers import RepositoriesContainer

from internal_services.openai_key import OpenAIKeyResource
from internal_services.workflow.engine import WorkflowEngineService

from .evaluation import EvaluationService
from .settings import Settings


class ServicesContainer(containers.DeclarativeContainer):
    service_settings = providers.Singleton(Settings)

    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )

    openai_key = providers.Resource(
        OpenAIKeyResource,
        aioboto3_session=aioboto3_session,
        openai_settings=service_settings.provided.openai,
    )

    evaluation_service = providers.Singleton(
        EvaluationService,
        evaluation_repository=RepositoriesContainer.evaluation_repository,
        evaluation_template_repository=RepositoriesContainer.evaluation_template_repository,
    )

    workflow_engine_service = providers.Singleton(
        WorkflowEngineService,
        workflow_engine=service_settings.provided.workflow_engine,
    )
