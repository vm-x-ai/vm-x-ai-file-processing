from dependency_injector import providers
from internal_db_services.containers import DatabaseContainer

import internal_db_repositories


class RepositoriesContainer(DatabaseContainer):
    file_repository = providers.Factory(
        internal_db_repositories.FileRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )

    file_embedding_repository = providers.Factory(
        internal_db_repositories.FileEmbeddingRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )

    file_content_repository = providers.Factory(
        internal_db_repositories.FileContentRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )

    file_evaluation_repository = providers.Factory(
        internal_db_repositories.FileEvaluationRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )

    project_repository = providers.Factory(
        internal_db_repositories.ProjectRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )

    evaluation_repository = providers.Factory(
        internal_db_repositories.EvaluationRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )

    evaluation_category_repository = providers.Factory(
        internal_db_repositories.EvaluationCategoryRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )

    evaluation_template_repository = providers.Factory(
        internal_db_repositories.EvaluationTemplateRepository,
        session_factory=DatabaseContainer.db.provided.session,
        write_session_factory=DatabaseContainer.db.provided.writer_session,
    )
