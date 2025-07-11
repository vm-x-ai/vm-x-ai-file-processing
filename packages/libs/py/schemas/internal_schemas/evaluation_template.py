from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class HttpEvaluationTemplateCreate(BaseModel):
    name: str
    description: str

    system_prompt: Optional[str] = Field(
        None, description="System prompt for the evaluation template"
    )
    prompt: str = Field(description="Prompt for the evaluation template")

    default: bool = Field(
        default=False,
        description=(
            "Whether the evaluation template is the "
            "default evaluation template within a category"
        ),
    )

    # Allow either category_id or category_name, but not both
    category_id: Optional[UUID] = Field(None, description="ID of existing category")
    category_name: Optional[str] = Field(
        None, description="Name of new category to create"
    )
    category_description: Optional[str] = Field(
        None, description="Description for new category"
    )


class HttpEvaluationTemplateUpdate(HttpEvaluationTemplateCreate): ...
