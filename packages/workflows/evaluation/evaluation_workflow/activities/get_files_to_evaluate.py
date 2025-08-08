import logging
from typing import Callable
from uuid import UUID

import internal_db_models
from internal_db_repositories.file import FileRepository
from internal_db_repositories.file_evaluation import FileEvaluationRepository

logger = logging.getLogger(__name__)


class GetFilesToEvaluateActivity:
    def __init__(
        self,
        file_evaluation_repository: FileEvaluationRepository,
        file_repository: FileRepository,
    ):
        self._file_evaluation_repository = file_evaluation_repository
        self._file_repository = file_repository

    def temporal_factory(self) -> Callable:
        from temporalio import activity

        @activity.defn(name="GetFilesToEvaluateActivity")
        async def _activity(
            evaluation: internal_db_models.EvaluationRead,
            old_evaluation: internal_db_models.EvaluationRead | None = None,
        ) -> list[UUID]:
            return await self.run(evaluation, old_evaluation)

        return _activity

    async def run(
        self,
        evaluation: internal_db_models.EvaluationRead,
        old_evaluation: internal_db_models.EvaluationRead | None = None,
    ) -> list[UUID]:
        parent_evaluation_option_changed = (
            old_evaluation
            and old_evaluation.parent_evaluation_option
            != evaluation.parent_evaluation_option
        )
        result: list[UUID] = []

        if evaluation.parent_evaluation_id and evaluation.parent_evaluation_option:
            parent_file_evaluations = (
                await self._file_evaluation_repository.get_by_evaluation_id(
                    evaluation.project_id,
                    evaluation.parent_evaluation_id,
                    old_evaluation.parent_evaluation_option
                    if parent_evaluation_option_changed
                    else evaluation.parent_evaluation_option,
                )
            )

            for file_evaluation in parent_file_evaluations:
                if file_evaluation.file_id not in result:
                    result.append(file_evaluation.file_id)

        if old_evaluation:
            file_evaluations = (
                await self._file_evaluation_repository.get_by_evaluation_id(
                    evaluation.project_id, evaluation.id
                )
            )

            for file_evaluation in file_evaluations:
                if file_evaluation.file_id not in result:
                    result.append(file_evaluation.file_id)
        else:
            files = await self._file_repository.get_by_project_id(evaluation.project_id)
            for file in files:
                if file.status == internal_db_models.FileStatus.COMPLETED:
                    result.append(file.id)

        return result
