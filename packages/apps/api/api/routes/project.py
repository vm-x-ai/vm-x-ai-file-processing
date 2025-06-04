import uuid

import dm_db_models
from dependency_injector.wiring import Provide, inject
from dm_db_repositories.project import ProjectRepository
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from api.containers import Container

router = APIRouter()


@router.get(
    "/projects",
    operation_id="getProjects",
    description="Get all projects",
    response_model=list[dm_db_models.ProjectReadWithStats],
    tags=["projects"],
)
@inject
async def get_projects(
    project_repository: ProjectRepository = Depends(
        Provide[Container.project_repository]
    ),
) -> list[dm_db_models.ProjectReadWithStats]:
    return await project_repository.get_all_with_stats()


class ProjectCreateRequest(BaseModel):
    name: str
    description: str


@router.post(
    "/projects",
    operation_id="createProject",
    description="Create a project",
    response_model=dm_db_models.ProjectRead,
    tags=["projects"],
)
@inject
async def create_project(
    request: ProjectCreateRequest,
    project_repository: ProjectRepository = Depends(
        Provide[Container.project_repository]
    ),
) -> dm_db_models.ProjectRead:
    return await project_repository.add(
        dm_db_models.ProjectCreate(
            id=uuid.uuid4(),
            name=request.name,
            description=request.description,
        ),
    )


@router.get(
    "/projects/{project_id}",
    operation_id="getProject",
    description="Get a project by id",
    response_model=dm_db_models.ProjectRead,
    tags=["projects"],
)
@inject
async def get_project(
    project_id: uuid.UUID,
    project_repository: ProjectRepository = Depends(
        Provide[Container.project_repository]
    ),
) -> dm_db_models.ProjectRead:
    return await project_repository.get(project_id)


class ProjectUpdateRequest(BaseModel):
    name: str
    description: str


@router.put(
    "/projects/{project_id}",
    operation_id="updateProject",
    description="Update a project by id",
    response_model=dm_db_models.ProjectRead,
    tags=["projects"],
)
@inject
async def update_project(
    project_id: uuid.UUID,
    request: ProjectUpdateRequest,
    project_repository: ProjectRepository = Depends(
        Provide[Container.project_repository]
    ),
) -> dm_db_models.ProjectRead:
    return await project_repository.update(
        project_id,
        request.model_dump(mode="json"),
    )


@router.delete(
    "/projects/{project_id}",
    operation_id="deleteProject",
    description="Delete a project by id",
    tags=["projects"],
)
@inject
async def delete_project(
    project_id: uuid.UUID,
    project_repository: ProjectRepository = Depends(
        Provide[Container.project_repository]
    ),
) -> None:
    await project_repository.delete(project_id)
