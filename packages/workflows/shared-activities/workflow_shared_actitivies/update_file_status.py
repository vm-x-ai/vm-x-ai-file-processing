import logging
from uuid import UUID

import internal_db_models
from internal_db_repositories.file import FileRepository

logger = logging.getLogger(__name__)


class UpdateFileStatusActivity:
    def __init__(self, file_repository: FileRepository):
        self._file_repository = file_repository

    async def run(self, file_id: UUID, status: internal_db_models.FileStatus):
        await self._file_repository.update(file_id, {"status": status})
