import logging
from uuid import UUID

from temporalio import activity

from ingestion_workflow import models
from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


@activity.defn
async def update_file_status(file_id: UUID, status: models.FileStatus):
    file_repository = Container.file_repository()
    await file_repository.update(file_id, {"status": status})
