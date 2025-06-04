import logging
from uuid import UUID

import dm_db_models
from temporalio import activity

from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


@activity.defn
async def update_file_status(file_id: UUID, status: dm_db_models.FileStatus):
    file_repository = Container.file_repository()
    await file_repository.update(file_id, {"status": status})
