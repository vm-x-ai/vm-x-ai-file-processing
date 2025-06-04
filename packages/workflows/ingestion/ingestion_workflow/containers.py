import aioboto3
import dm_db_repositories
import dm_services
from dependency_injector import containers, providers
from dm_db_services import Database
from dm_temporal_utils import init_temporal_client

from ingestion_workflow.settings import Settings


class Container(containers.DeclarativeContainer):
    settings = providers.Singleton(Settings)

    db = providers.Singleton(
        Database,
        db_url=settings.provided.db_url,
        db_ro_url=settings.provided.db_ro_url,
    )

    temporal_client = providers.Resource(
        init_temporal_client,
        host=settings.provided.temporal_host,
    )

    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )

    file_repository = providers.Factory(
        dm_db_repositories.FileRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    file_embedding_repository = providers.Factory(
        dm_db_repositories.FileEmbeddingRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    file_content_repository = providers.Factory(
        dm_db_repositories.FileContentRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    file_evaluation_repository = providers.Factory(
        dm_db_repositories.FileEvaluationRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    project_repository = providers.Factory(
        dm_db_repositories.ProjectRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    evaluation_repository = providers.Factory(
        dm_db_repositories.EvaluationRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    evaluation_category_repository = providers.Factory(
        dm_db_repositories.EvaluationCategoryRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    evaluation_template_repository = providers.Factory(
        dm_db_repositories.EvaluationTemplateRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    evaluation_service = providers.Factory(
        dm_services.EvaluationService,
        evaluation_repository=evaluation_repository,
        evaluation_template_repository=evaluation_template_repository,
    )
