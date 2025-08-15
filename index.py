from uuid import UUID
from internal_utils import parse_args


async def generate_llm_requests(
    file_id: UUID,
    workflow_id: str,
    evaluation_id: UUID | None = None,
    parent_evaluation_id: UUID | None = None,
    parent_evaluation_option: str | None = None,
):
    pass


print(parse_args(
    generate_llm_requests, {
        "file_id": "123e4567-e89b-12d3-a456-426614174000",
        "workflow_id": "123e4567-e89b-12d3-a456-426614174000",
        "evaluation_id": None,
        "parent_evaluation_id": "123e4567-e89b-12d3-a456-426614174000",
        "parent_evaluation_option": None
    }
)
)
