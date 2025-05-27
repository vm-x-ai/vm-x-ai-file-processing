import asyncio
import logging
import uuid
from uuid import UUID

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, Query
from utils.s3 import generate_download_url

from ingestion_workflow import models
from ingestion_workflow.containers import Container
from ingestion_workflow.repositories.evaluation import EvaluationRepository
from ingestion_workflow.repositories.evaluation_category import EvaluationCategoryRepository
from ingestion_workflow.repositories.file_evaluation import FileEvaluationRepository
from ingestion_workflow.schema.evaluation import (
    HttpEvaluationCreate,
    HttpEvaluationUpdate,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get(
    "/projects/{project_id}/evaluations",
    operation_id="getEvaluations",
    description="Get all evaluations for a project",
    response_model=list[models.EvaluationRead],
    tags=["evaluations"],
)
@inject
async def get_evaluations(
    project_id: UUID,
    evaluation_repository: EvaluationRepository = Depends(
        Provide[Container.evaluation_repository]
    ),
) -> list[models.EvaluationRead]:
    return await evaluation_repository.get_by_project_id(
        project_id=project_id,
    )


@router.get(
    "/projects/{project_id}/evaluations/tree",
    operation_id="getEvaluationsTree",
    description="Get all evaluations for a project",
    response_model=list[models.EvaluationTree],
    tags=["evaluations"],
)
@inject
async def get_evaluations_tree(
    project_id: UUID,
    evaluation_repository: EvaluationRepository = Depends(
        Provide[Container.evaluation_repository]
    ),
) -> list[models.EvaluationTree]:
    evaluations = await evaluation_repository.get_by_project_id(
        project_id=project_id,
    )

    root_evaluations: list[models.EvaluationTree] = []
    evaluation_map = {
        evaluation.id: models.EvaluationTree.model_validate(evaluation)
        for evaluation in evaluations
    }
    for evaluation in evaluations:
        if evaluation.parent_evaluation_id:
            evaluation_map[evaluation.parent_evaluation_id].children.append(
                evaluation_map[evaluation.id]
            )
        else:
            root_evaluations.append(evaluation_map[evaluation.id])

    return root_evaluations


@router.get(
    "/projects/{project_id}/evaluation/{evaluation_id}/files",
    operation_id="getFilesByEvaluation",
    description="Get all files for an evaluation",
    response_model=list[models.FileEvaluationReadWithFile],
    tags=["evaluations"],
)
@inject
async def get_files_by_evaluation(
    project_id: UUID,
    evaluation_id: UUID,
    option_value: str | None = Query(default=None),
    file_evaluation_repository: FileEvaluationRepository = Depends(
        Provide[Container.file_evaluation_repository]
    ),
) -> list[models.FileEvaluationReadWithFile]:
    files = await file_evaluation_repository.get_by_evaluation_id(
        project_id=project_id,
        evaluation_id=evaluation_id,
        option_value=option_value,
    )

    async def update_file_evaluation(
        file_evaluation: models.FileEvaluationReadWithFile,
    ) -> models.FileEvaluationReadWithFile:
        if file_evaluation.file.thumbnail_url:
            file_evaluation.file.thumbnail_url = await generate_download_url(
                file_evaluation.file.thumbnail_url,
                Container.aioboto3_session(),
            )
        return file_evaluation

    return await asyncio.gather(
        *[update_file_evaluation(file_evaluation) for file_evaluation in files]
    )


@router.post(
    "/projects/{project_id}/evaluations",
    operation_id="createEvaluation",
    description="Create an evaluation for a project",
    response_model=models.EvaluationRead,
    tags=["evaluations"],
)
@inject
async def create_evaluation(
    project_id: UUID,
    payload: HttpEvaluationCreate,
    evaluation_repository: EvaluationRepository = Depends(
        Provide[Container.evaluation_repository]
    ),
    evaluation_category_repository: EvaluationCategoryRepository = Depends(
        Provide[Container.evaluation_category_repository]
    ),
) -> models.EvaluationRead:
    # Handle category creation/assignment
    category_id = payload.category_id
    if payload.category_name:
        # Find or create category by name
        category = await evaluation_category_repository.find_or_create_by_name(
            name=payload.category_name,
            project_id=project_id,
            description=payload.category_description
        )
        category_id = category.id
    elif not category_id:
        # Ensure default category exists
        default_category = await evaluation_category_repository.ensure_default_category_exists(project_id)
        category_id = default_category.id

    return await evaluation_repository.add(
        models.EvaluationCreate.model_validate(
            {
                **payload.model_dump(exclude={"project_id", "category_name", "category_description"}),
                "project_id": project_id,
                "category_id": category_id,
                "id": uuid.uuid4(),
            }
        )
    )


@router.put(
    "/projects/{project_id}/evaluations/{evaluation_id}",
    operation_id="updateEvaluation",
    description="Update an evaluation for a project",
    response_model=models.EvaluationRead,
    tags=["evaluations"],
)
@inject
async def update_evaluation(
    project_id: UUID,
    evaluation_id: UUID,
    payload: HttpEvaluationUpdate,
    evaluation_repository: EvaluationRepository = Depends(
        Provide[Container.evaluation_repository]
    ),
) -> models.EvaluationRead:
    await evaluation_repository.update(
        evaluation_id,
        {
            **payload.model_dump(exclude={"project_id"}),
        },
    )

    return await evaluation_repository.get(evaluation_id)


@router.delete(
    "/projects/{project_id}/evaluations/{evaluation_id}",
    operation_id="deleteEvaluation",
    description="Delete an evaluation by project and evaluation id",
    tags=["evaluations"],
)
@inject
async def delete_evaluation(
    project_id: UUID,
    evaluation_id: UUID,
    evaluation_repository: EvaluationRepository = Depends(
        Provide[Container.evaluation_repository]
    ),
) -> None:
    await evaluation_repository.delete(evaluation_id)


@router.get(
    "/projects/{project_id}/evaluation-categories",
    operation_id="getEvaluationCategories",
    description="Get all evaluation categories for a project",
    response_model=list[models.EvaluationCategoryRead],
    tags=["evaluation-categories"],
)
@inject
async def get_evaluation_categories(
    project_id: UUID,
    evaluation_category_repository: EvaluationCategoryRepository = Depends(
        Provide[Container.evaluation_category_repository]
    ),
) -> list[models.EvaluationCategoryRead]:
    return await evaluation_category_repository.get_by_project_id(
        project_id=project_id,
    )


@router.post(
    "/projects/{project_id}/evaluation-categories",
    operation_id="createEvaluationCategory",
    description="Create an evaluation category for a project",
    response_model=models.EvaluationCategoryRead,
    tags=["evaluation-categories"],
)
@inject
async def create_evaluation_category(
    project_id: UUID,
    payload: dict,
    evaluation_category_repository: EvaluationCategoryRepository = Depends(
        Provide[Container.evaluation_category_repository]
    ),
) -> models.EvaluationCategoryRead:
    return await evaluation_category_repository.add(
        models.EvaluationCategoryCreate.model_validate(
            {
                "name": payload["name"],
                "description": payload.get("description"),
                "project_id": project_id,
                "id": uuid.uuid4(),
            }
        )
    )


@router.put(
    "/projects/{project_id}/evaluation-categories/{category_id}",
    operation_id="updateEvaluationCategory",
    description="Update an evaluation category for a project",
    response_model=models.EvaluationCategoryRead,
    tags=["evaluation-categories"],
)
@inject
async def update_evaluation_category(
    project_id: UUID,
    category_id: UUID,
    payload: dict,
    evaluation_category_repository: EvaluationCategoryRepository = Depends(
        Provide[Container.evaluation_category_repository]
    ),
) -> models.EvaluationCategoryRead:
    await evaluation_category_repository.update(
        category_id,
        {
            "name": payload["name"],
            "description": payload.get("description"),
        },
    )
    return await evaluation_category_repository.get(category_id)


@router.delete(
    "/projects/{project_id}/evaluation-categories/{category_id}",
    operation_id="deleteEvaluationCategory",
    description="Delete an evaluation category for a project",
    tags=["evaluation-categories"],
)
@inject
async def delete_evaluation_category(
    project_id: UUID,
    category_id: UUID,
    evaluation_category_repository: EvaluationCategoryRepository = Depends(
        Provide[Container.evaluation_category_repository]
    ),
) -> None:
    await evaluation_category_repository.delete(category_id)


@router.get(
    "/projects/{project_id}/evaluation-categories/{category_id}/evaluations",
    operation_id="getEvaluationsByCategory",
    description="Get all evaluations for a specific category",
    response_model=list[models.EvaluationRead],
    tags=["evaluation-categories"],
)
@inject
async def get_evaluations_by_category(
    project_id: UUID,
    category_id: UUID,
    evaluation_repository: EvaluationRepository = Depends(
        Provide[Container.evaluation_repository]
    ),
) -> list[models.EvaluationRead]:
    return await evaluation_repository.get_by_category_id(
        project_id=project_id,
        category_id=category_id,
    )
