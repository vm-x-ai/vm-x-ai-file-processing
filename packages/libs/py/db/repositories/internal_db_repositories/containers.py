from dependency_injector import providers
from internal_db_services.containers import DatabaseContainer

import internal_db_repositories


class RepositoriesContainer(DatabaseContainer):
    file_repository = providers.Singleton(
        internal_db_repositories.FileRepository,
        db=DatabaseContainer.db,
    )

    file_embedding_repository = providers.Singleton(
        internal_db_repositories.FileEmbeddingRepository,
        db=DatabaseContainer.db,
    )

    file_content_repository = providers.Singleton(
        internal_db_repositories.FileContentRepository,
        db=DatabaseContainer.db,
    )

    file_evaluation_repository = providers.Singleton(
        internal_db_repositories.FileEvaluationRepository,
        db=DatabaseContainer.db,
    )

    project_repository = providers.Singleton(
        internal_db_repositories.ProjectRepository,
        db=DatabaseContainer.db,
    )

    evaluation_repository = providers.Singleton(
        internal_db_repositories.EvaluationRepository,
        db=DatabaseContainer.db,
    )

    evaluation_category_repository = providers.Singleton(
        internal_db_repositories.EvaluationCategoryRepository,
        db=DatabaseContainer.db,
    )

    evaluation_template_repository = providers.Singleton(
        internal_db_repositories.EvaluationTemplateRepository,
        db=DatabaseContainer.db,
    )
