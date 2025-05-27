import logging
from uuid import UUID

from temporalio import activity

from ingestion_workflow import models
from ingestion_workflow.containers import Container

logger = logging.getLogger(__name__)


@activity.defn
async def get_files_to_evaluate(
    evaluation: models.EvaluationRead,
    old_evaluation: models.EvaluationRead | None = None,
) -> list[UUID]:
    file_evaluation_repository = Container.file_evaluation_repository()
    file_repository = Container.file_repository()
    parent_evaluation_option_changed = (
        old_evaluation
        and old_evaluation.parent_evaluation_option
        != evaluation.parent_evaluation_option
    )
    result: list[UUID] = []

    if evaluation.parent_evaluation_id and evaluation.parent_evaluation_option:
        parent_file_evaluations = await file_evaluation_repository.get_by_evaluation_id(
            evaluation.project_id,
            evaluation.parent_evaluation_id,
            old_evaluation.parent_evaluation_option
            if parent_evaluation_option_changed
            else evaluation.parent_evaluation_option,
        )

        for file_evaluation in parent_file_evaluations:
            if file_evaluation.file_id not in result:
                result.append(file_evaluation.file_id)

    if old_evaluation:
        file_evaluations = await file_evaluation_repository.get_by_evaluation_id(
            evaluation.project_id, evaluation.id
        )

        for file_evaluation in file_evaluations:
            if file_evaluation.file_id not in result:
                result.append(file_evaluation.file_id)
    else:
        files = await file_repository.get_by_project_id(evaluation.project_id)
        for file in files:
            if file.status == models.FileStatus.COMPLETED:
                result.append(file.id)

    return result
