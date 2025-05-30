import logging
from typing import Optional
from uuid import UUID

import jinja2

from ingestion_workflow import models
from ingestion_workflow.repositories.evaluation import EvaluationRepository
from ingestion_workflow.repositories.evaluation_template import (
    EvaluationTemplateRepository,
)

logger = logging.getLogger(__name__)


class EvaluationService:
    def __init__(
        self,
        evaluation_repository: EvaluationRepository,
        evaluation_template_repository: EvaluationTemplateRepository,
    ):
        self._repo = evaluation_repository
        self._template_repo = evaluation_template_repository

    async def get_by_project_id_and_parent_evaluation_id(
        self,
        project_id: UUID,
        parent_evaluation_id: Optional[UUID] = None,
        parent_evaluation_option: Optional[str] = None,
    ) -> list[models.EvaluationReadWithTemplate]:
        evaluations = await self._repo.get_by_project_id_and_parent_evaluation_id(
            project_id,
            parent_evaluation_id,
            parent_evaluation_option,
        )

        logger.info(
            f"Found {len(evaluations)} evaluations, applying templates if needed"
        )

        return [
            self._apply_template(evaluation, evaluation.template)
            for evaluation in evaluations
        ]

    async def get(self, id: UUID) -> models.EvaluationRead:
        evaluation = await super().get(id)
        if not evaluation.template_id:
            return evaluation

        template = await self._template_repo.get(evaluation.template_id)
        if not template:
            return evaluation

        return self._apply_template(evaluation, template)

    def _apply_template(
        self,
        evaluation: models.EvaluationRead | models.EvaluationReadWithTemplate,
        template: models.EvaluationTemplateRead | None,
    ) -> models.EvaluationRead | models.EvaluationReadWithTemplate:
        if not template:
            return evaluation

        jinja_env = jinja2.Environment()
        if not evaluation.system_prompt:
            logger.info(
                "System prompt is not set in evaluation, rendering from template"
            )
            jinja_template = jinja_env.from_string(template.system_prompt)
            evaluation.system_prompt = jinja_template.render(
                evaluation.model_dump(mode="json")
            )

        if not evaluation.prompt:
            logger.info("Prompt is not set in evaluation, rendering from template")
            jinja_template = jinja_env.from_string(template.prompt)
            evaluation.prompt = jinja_template.render(
                evaluation.model_dump(mode="json")
            )

        return evaluation
