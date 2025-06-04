import asyncio
import logging
import uuid
from uuid import UUID

import dm_db_models
from dependency_injector.wiring import Provide, inject
from dm_db_repositories.evaluation_category import (
    EvaluationCategoryRepository,
)
from dm_db_repositories.evaluation_template import (
    EvaluationTemplateRepository,
)
from dm_schemas.evaluation_template import (
    HttpEvaluationTemplateCreate,
    HttpEvaluationTemplateUpdate,
)
from fastapi import APIRouter, Depends

from api.containers import Container

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get(
    "/projects/{project_id}/evaluation-templates",
    operation_id="getEvaluationTemplates",
    description="Get all evaluation templates for a project",
    response_model=list[dm_db_models.EvaluationTemplateRead],
    tags=["evaluation-templates"],
)
@inject
async def get_evaluation_templates(
    project_id: UUID,
    evaluation_template_repository: EvaluationTemplateRepository = Depends(
        Provide[Container.evaluation_template_repository]
    ),
) -> list[dm_db_models.EvaluationTemplateRead]:
    return await evaluation_template_repository.get_by_project_id(
        project_id=project_id,
    )


@router.post(
    "/projects/{project_id}/evaluation-templates",
    operation_id="createEvaluationTemplate",
    description="Create an evaluation template for a project",
    response_model=dm_db_models.EvaluationTemplateRead,
    tags=["evaluation-templates"],
)
@inject
async def create_evaluation_template(
    project_id: UUID,
    payload: HttpEvaluationTemplateCreate,
    evaluation_template_repository: EvaluationTemplateRepository = Depends(
        Provide[Container.evaluation_template_repository]
    ),
    evaluation_category_repository: EvaluationCategoryRepository = Depends(
        Provide[Container.evaluation_category_repository]
    ),
) -> dm_db_models.EvaluationTemplateRead:
    # Handle category creation/assignment
    category_id = payload.category_id
    if payload.category_name:
        # Find or create category by name
        category = await evaluation_category_repository.find_or_create_by_name(
            name=payload.category_name,
            project_id=project_id,
            description=payload.category_description,
        )
        category_id = category.id
    elif not category_id:
        # Ensure default category exists
        default_category = (
            await evaluation_category_repository.ensure_default_category_exists(
                project_id
            )
        )
        category_id = default_category.id

    if payload.default:
        await _reset_category_default(payload, category_id)

    return await evaluation_template_repository.add(
        dm_db_models.EvaluationTemplateCreate.model_validate(
            {
                **payload.model_dump(),
                "project_id": project_id,
                "category_id": category_id,
                "id": uuid.uuid4(),
            }
        )
    )


@inject
async def _reset_category_default(
    payload: HttpEvaluationTemplateCreate | HttpEvaluationTemplateUpdate,
    category_id: UUID,
    evaluation_template_repository: EvaluationTemplateRepository = Provide[
        Container.evaluation_template_repository
    ],
):
    default_category_templates = (
        await evaluation_template_repository.get_default_by_category_id(category_id)
    )

    await asyncio.gather(
        *[
            evaluation_template_repository.update(
                template.id,
                {**template.model_dump(exclude={"default"}), "default": False},
            )
            for template in default_category_templates
        ]
    )


@router.put(
    "/projects/{project_id}/evaluation-templates/{evaluation_template_id}",
    operation_id="updateEvaluationTemplate",
    description="Update an evaluation template for a project",
    response_model=dm_db_models.EvaluationTemplateRead,
    tags=["evaluation-templates"],
)
@inject
async def update_evaluation_template(
    project_id: UUID,
    evaluation_template_id: UUID,
    payload: HttpEvaluationTemplateUpdate,
    evaluation_template_repository: EvaluationTemplateRepository = Depends(
        Provide[Container.evaluation_template_repository]
    ),
) -> dm_db_models.EvaluationTemplateRead:
    if payload.default and payload.category_id:
        await _reset_category_default(payload, payload.category_id)

    return await evaluation_template_repository.update(
        evaluation_template_id,
        {
            **payload.model_dump(
                exclude={
                    "project_id",
                    "category_description",
                    "category_name",
                }
            ),
            "project_id": project_id,
        },
    )


@router.delete(
    "/projects/{project_id}/evaluation-templates/{evaluation_template_id}",
    operation_id="deleteEvaluationTemplate",
    description="Delete an evaluation template by project and evaluation template id",
    tags=["evaluation-templates"],
)
@inject
async def delete_evaluation_template(
    project_id: UUID,
    evaluation_template_id: UUID,
    evaluation_template_repository: EvaluationTemplateRepository = Depends(
        Provide[Container.evaluation_template_repository]
    ),
) -> None:
    await evaluation_template_repository.delete(evaluation_template_id)
