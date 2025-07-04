from dependency_injector import containers, providers
from vmxfp_db_repositories.containers import RepositoriesContainer

from .evaluation import EvaluationService


class ServicesContainer(containers.DeclarativeContainer):
    evaluation_service = providers.Factory(
        EvaluationService,
        evaluation_repository=RepositoriesContainer.evaluation_repository,
        evaluation_template_repository=RepositoriesContainer.evaluation_template_repository,
    )
