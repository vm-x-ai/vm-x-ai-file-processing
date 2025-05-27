from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from ingestion_workflow.models.evaluation import EvaluationBase, EvaluationType


class HttpEvaluationCreate(BaseModel):
    title: str = Field(description="Title of the evaluation")
    description: str = Field(description="Description of the evaluation")
    system_prompt: Optional[str] = Field(
        None, description="System prompt for the evaluation"
    )
    prompt: str = Field(description="Prompt for the evaluation")
    evaluation_type: EvaluationType = Field(description="Type of evaluation")
    evaluation_options: Optional[list[str]] = Field(
        None, description="Options for enum_choice evaluations"
    )
    parent_evaluation_id: Optional[UUID] = Field(
        None, description="Parent evaluation ID"
    )
    parent_evaluation_option: Optional[str] = Field(
        None, description="Parent evaluation option"
    )

    # Allow either category_id or category_name, but not both
    category_id: Optional[UUID] = Field(None, description="ID of existing category")
    category_name: Optional[str] = Field(
        None, description="Name of new category to create"
    )
    category_description: Optional[str] = Field(
        None, description="Description for new category"
    )

    @model_validator(mode="after")
    def validate_category(self):
        if not self.category_id and not self.category_name:
            raise ValueError("Either category_id or category_name must be provided")
        if self.category_id and self.category_name:
            raise ValueError("Cannot provide both category_id and category_name")
        return self


class HttpEvaluationUpdate(EvaluationBase): ...
