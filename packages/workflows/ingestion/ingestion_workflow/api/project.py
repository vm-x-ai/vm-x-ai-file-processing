from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends
from sqlmodel import col

from ingestion_workflow import models
from ingestion_workflow.containers import Container
from ingestion_workflow.repositories.project import ProjectRepository

router = APIRouter()


@router.get(
    "/projects",
    operation_id="getProjects",
    description="Get all projects",
    response_model=list[models.ProjectRead],
)
@inject
async def get_projects(
    project_repository: ProjectRepository = Depends(
        Provide[Container.project_repository]
    ),
) -> list[models.ProjectRead]:
    return await project_repository.get_all(
        order_by=col(models.Project.created_at),
        order_type="desc",
    )
