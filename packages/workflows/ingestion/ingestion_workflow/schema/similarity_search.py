import enum
from uuid import UUID

from pydantic import BaseModel


class SimilaritySearchWhenMatchReturn(str, enum.Enum):
    """
    Identifies which type to return when a match is found.

    - CHUNK: The default behavior, return the chunk that was matched.
    - CONTENT: Return the content related to the matched chunk.

    Example:
    When a PDF is uploaded, the langchain loader returns a list of documents,
    one for each page.

    The document is stored in the database as a FileContent record.
    When a user searches for a given query, and the chunk is matched,
    it will return the entire page.

    """

    CHUNK = "chunk"
    CONTENT = "content"


class SimilaritySearchOrderBy(str, enum.Enum):
    """
    Fields to order the results by.
    """

    SCORE = "score"
    CHUNK = "chunk"


class SimilaritySearchRequest(BaseModel):
    """
    Request for a similarity search.

    - query: The query to search for.
    - limit: The maximum number of results to return.
    - score_threshold: The minimum score to return a result.
    - when_match_return: Identifies which type to return when a match is found.
        (default: chunk)
    - before_neighbor_count: The number of neighbors to return before the match.
        (default: 0)
    - after_neighbor_count: The number of neighbors to return after the match.
        (default: 0)
    - order_by: The field to order the results by. (default: chunk)

    When the before and after neighbor counts are provided with a value greater than 0,
    when a match is found, it will also return the chunk/content before
    and after the match.
    """

    query: str
    limit: int | None = None
    score_threshold: float | None = None
    when_match_return: SimilaritySearchWhenMatchReturn = (
        SimilaritySearchWhenMatchReturn.CHUNK
    )
    before_neighbor_count: int = 0
    after_neighbor_count: int = 0
    order_by: SimilaritySearchOrderBy = SimilaritySearchOrderBy.SCORE
    file_ids: list[UUID] | None = None
