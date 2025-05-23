import aioboto3
from dependency_injector import containers, providers
from temporalio.client import Client

from ingestion_workflow import repositories
from ingestion_workflow.database import Database
from ingestion_workflow.pydantic_converter import pydantic_data_converter
from ingestion_workflow.settings import Settings


class Container(containers.DeclarativeContainer):
    settings = providers.Singleton(Settings)

    db = providers.Singleton(
        Database,
        db_url=settings.provided.db_url,
        db_ro_url=settings.provided.db_ro_url,
    )

    async def _init_temporal_client(host: str):
        client = await Client.connect(
            host,
            data_converter=pydantic_data_converter,
        )
        yield client

    temporal_client = providers.Resource(
        _init_temporal_client,
        host=settings.provided.temporal_host,
    )

    aioboto3_session = providers.Singleton(
        aioboto3.Session,
    )

    file_repository = providers.Factory(
        repositories.FileRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    file_embedding_repository = providers.Factory(
        repositories.FileEmbeddingRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    file_content_repository = providers.Factory(
        repositories.FileContentRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    file_evaluation_repository = providers.Factory(
        repositories.FileEvaluationRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    project_repository = providers.Factory(
        repositories.ProjectRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )

    evaluation_repository = providers.Factory(
        repositories.EvaluationRepository,
        session_factory=db.provided.session,
        write_session_factory=db.provided.writer_session,
    )
