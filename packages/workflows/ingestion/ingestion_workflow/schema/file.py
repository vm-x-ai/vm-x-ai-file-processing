from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class FileSearchEvaluation(BaseModel):
    evaluation_id: UUID
    response_value: str | None = None


class FileSearchEvaluationOperation(BaseModel):
    operation: Literal["eq", "neq"]
    value: FileSearchEvaluation


class FileSearchEvaluationGroup(BaseModel):
    operation: Literal["and", "or"]
    evaluations: list["FileSearchEvaluationOperation | FileSearchEvaluationGroup"]


class FileSearchRequest(BaseModel):
    search_query: str | None = None
    evaluations: FileSearchEvaluationGroup | None = None
