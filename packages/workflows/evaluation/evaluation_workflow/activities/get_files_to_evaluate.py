import logging

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

    async def run(
        self,
        evaluation: internal_db_models.EvaluationRead,
        old_evaluation: internal_db_models.EvaluationRead | None = None,
    ) -> list[str]:
        parent_evaluation_option_changed = (
            old_evaluation
            and old_evaluation.parent_evaluation_option
            != evaluation.parent_evaluation_option
        )
        result: list[str] = []

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
                if (
                    file_evaluation.file_id not in result
                    and str(file_evaluation.file_id) not in result
                ):
                    result.append(str(file_evaluation.file_id))

        if old_evaluation:
            file_evaluations = (
                await self._file_evaluation_repository.get_by_evaluation_id(
                    evaluation.project_id, evaluation.id
                )
            )

            for file_evaluation in file_evaluations:
                if (
                    file_evaluation.file_id not in result
                    and str(file_evaluation.file_id) not in result
                ):
                    result.append(str(file_evaluation.file_id))
        else:
            files = await self._file_repository.get_by_project_id(evaluation.project_id)
            for file in files:
                if (
                    file.status == internal_db_models.FileStatus.COMPLETED
                    and str(file.id) not in result
                ):
                    result.append(str(file.id))

        return result
