import enum
from collections.abc import Sequence
from contextlib import AbstractAsyncContextManager
from typing import Any, Callable, cast
from uuid import UUID

import vmxfp_db_models
from pydantic import BaseModel
from sqlalchemy import (
    Column,
    ColumnExpressionArgument,
    Subquery,
    false,
    func,
    literal,
    null,
    text,
    true,
)
from sqlalchemy.orm import aliased
from sqlmodel import any_, case, col, select
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel.sql.expression import Select, SelectOfScalar

from .base import BaseRepository


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


class FileEmbeddingRepository(
    BaseRepository[
        UUID,
        vmxfp_db_models.FileEmbedding,
        vmxfp_db_models.FileEmbeddingRead,
        vmxfp_db_models.FileEmbeddingCreate,
    ]
):
    def __init__(
        self,
        session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
        write_session_factory: Callable[..., AbstractAsyncContextManager[AsyncSession]],
    ):
        super().__init__(
            session_factory,
            write_session_factory,
            vmxfp_db_models.FileEmbedding,
            vmxfp_db_models.FileEmbeddingRead,
            vmxfp_db_models.FileEmbeddingCreate,
        )

    @property
    def _id_fields(self) -> tuple[Column[UUID]]:
        return (cast(Column[UUID], vmxfp_db_models.FileEmbedding.id),)

    def _id_predicate(self, id: UUID) -> ColumnExpressionArgument[bool]:
        return col(vmxfp_db_models.FileEmbedding.id) == id

    async def get_by_file_id(
        self, file_id: UUID
    ) -> list[vmxfp_db_models.FileEmbeddingRead]:
        async with self._session_factory() as session:
            query = select(vmxfp_db_models.FileEmbedding).where(
                vmxfp_db_models.FileEmbedding.file_id == file_id
            )

            result = await session.scalars(query)

            return [
                vmxfp_db_models.FileEmbeddingRead.model_validate(embedding)
                for embedding in result.all()
            ]

    async def similarity_search(
        self,
        project_id: UUID,
        query_embedding: list[float],
        payload: SimilaritySearchRequest,
    ) -> (
        list[vmxfp_db_models.FileEmbeddingRead]
        | list[vmxfp_db_models.FileContentReadWithChunkScore]
    ):
        """Performs a similarity search for file chunks within a specific file.

        Args:
            query_embedding: Vector embedding to compare against stored chunks
            payload: Payload containing search parameters

        Returns:
            List of chunks.
        """
        async with self._session_factory() as session:
            query = self._create_base_similarity_search_query(
                query_embedding,
                payload,
                lambda query, subquery: (
                    query.where(subquery.c.project_id == project_id).where(
                        col(subquery.c.file_id).in_(payload.file_ids)
                    )
                ),
            )

            result = await session.exec(query)
            return self._parse_similarity_search_result(payload, result.all())

    def _create_base_similarity_search_query(
        self,
        query_embedding: list[float],
        payload: SimilaritySearchRequest,
        filter_fn: Callable[
            [
                SelectOfScalar[tuple[vmxfp_db_models.FileEmbedding, float]],
                Subquery,
            ],
            SelectOfScalar[tuple[vmxfp_db_models.FileEmbedding, float]],
        ],
    ) -> (
        Select[tuple[vmxfp_db_models.FileEmbedding, float, bool, UUID]]
        | Select[
            tuple[
                vmxfp_db_models.FileContent,
                float,
                bool,
                UUID,
                vmxfp_db_models.FileEmbedding,
            ]
        ]
    ):
        """Creates a base similarity search query with common parameters.

        Args:
            query_embedding: Vector embedding to compare against stored chunks
            payload: Payload containing search parameters

        Returns:
            SQLAlchemy Select query object configured for similarity search
        """
        similarity_score = 1 - vmxfp_db_models.FileEmbedding.embedding.cosine_distance(
            query_embedding
        )

        score_query = select(
            vmxfp_db_models.FileEmbedding, similarity_score.label("score")
        )

        if payload.limit is not None:
            score_query = score_query.limit(payload.limit)

        score_subquery = score_query.subquery("score")

        query: SelectOfScalar[tuple[vmxfp_db_models.FileEmbedding, float]] = select(
            score_subquery
        )  # type: ignore
        query = filter_fn(query, score_subquery)
        if payload.score_threshold is not None:
            query = query.where(score_subquery.c.score > payload.score_threshold)

        match payload.order_by:
            case SimilaritySearchOrderBy.SCORE:
                query = query.order_by(score_subquery.c.score.desc())
            case SimilaritySearchOrderBy.CHUNK:
                query = query.order_by(col(score_subquery.c.chunk_number).asc())

        query_cte = query.cte("score_cte")
        query_cte_alias = aliased(vmxfp_db_models.FileEmbedding, query_cte)
        neighbor_query: (
            Select[tuple[vmxfp_db_models.FileEmbedding, Any]]
            | Select[tuple[vmxfp_db_models.FileContent, Any]]
        )

        match payload.when_match_return:
            case SimilaritySearchWhenMatchReturn.CHUNK:
                neighbor_query = (
                    select(
                        vmxfp_db_models.FileEmbedding,
                        func.array_agg(col(vmxfp_db_models.FileEmbedding.id))
                        .over(
                            partition_by=col(vmxfp_db_models.FileEmbedding.file_id),
                            order_by=col(vmxfp_db_models.FileEmbedding.chunk_number),
                            range_=(
                                -payload.before_neighbor_count,
                                payload.after_neighbor_count,
                            ),
                        )
                        .label("neighbor_ids"),
                    )
                    .prefix_with(text("DISTINCT ON (file_embeddings.id)"))
                    .where(
                        col(vmxfp_db_models.FileEmbedding.file_id)
                        == col(query_cte.c.file_id),
                    )
                )
            case SimilaritySearchWhenMatchReturn.CONTENT:
                neighbor_query = (
                    select(
                        vmxfp_db_models.FileContent,
                        func.array_agg(col(vmxfp_db_models.FileContent.id))
                        .over(
                            partition_by=col(vmxfp_db_models.FileContent.file_id),
                            order_by=col(vmxfp_db_models.FileContent.content_number),
                            range_=(
                                -payload.before_neighbor_count,
                                payload.after_neighbor_count,
                            ),
                        )
                        .label("neighbor_ids"),
                    )
                    .prefix_with(text("DISTINCT ON (file_contents.id)"))
                    .where(
                        col(vmxfp_db_models.FileContent.file_id)
                        == col(query_cte.c.file_id),
                    )
                )

        neighbor_query_cte = neighbor_query.cte("neighbor_query_cte")
        result_query: Select

        match payload.when_match_return:
            case SimilaritySearchWhenMatchReturn.CHUNK:
                result_query = (
                    (
                        select(
                            vmxfp_db_models.FileEmbedding,
                            case(
                                (
                                    col(vmxfp_db_models.FileEmbedding.id)
                                    != col(neighbor_query_cte.c.id),
                                    literal(0),
                                ),
                                else_=query_cte.c.score,
                            ).label("score"),
                            case(
                                (
                                    col(vmxfp_db_models.FileEmbedding.id)
                                    != col(neighbor_query_cte.c.id),
                                    true(),
                                ),
                                else_=false(),
                            ).label("is_neighbor"),
                            case(
                                (
                                    col(vmxfp_db_models.FileEmbedding.id)
                                    != col(neighbor_query_cte.c.id),
                                    neighbor_query_cte.c.id,
                                ),
                                else_=null(),
                            ).label("neighbor_from"),
                        )
                        .select_from(query_cte, neighbor_query_cte)
                        .join(
                            neighbor_query_cte,
                            col(neighbor_query_cte.c.id) == col(query_cte.c.id),
                        )
                        .join(
                            vmxfp_db_models.FileEmbedding,
                            col(vmxfp_db_models.FileEmbedding.id)
                            == any_(neighbor_query_cte.c.neighbor_ids),
                        )
                        .order_by(
                            col(vmxfp_db_models.FileEmbedding.chunk_number).asc()
                            if payload.order_by == SimilaritySearchOrderBy.CHUNK
                            else text("score DESC")
                        )
                    )
                    if payload.before_neighbor_count > 0
                    or payload.after_neighbor_count > 0
                    else (
                        select(
                            vmxfp_db_models.FileEmbedding,
                            query_cte.c.score,
                            false().label("is_neighbor"),
                            null().label("neighbor_from"),
                        )
                        .select_from(query_cte)
                        .join(
                            vmxfp_db_models.FileEmbedding,
                            col(vmxfp_db_models.FileEmbedding.id)
                            == col(query_cte.c.id),
                        )
                    )
                )

            case SimilaritySearchWhenMatchReturn.CONTENT:
                result_query = (
                    (
                        # SQLModel select does not have a overload for 4 expressions
                        select(  # type: ignore
                            vmxfp_db_models.FileContent,
                            case(
                                (
                                    col(vmxfp_db_models.FileContent.id)
                                    != col(neighbor_query_cte.c.id),
                                    literal(0),
                                ),
                                else_=query_cte.c.score,
                            ).label("score"),
                            case(
                                (
                                    col(vmxfp_db_models.FileContent.id)
                                    != col(neighbor_query_cte.c.id),
                                    true(),
                                ),
                                else_=false(),
                            ).label("is_neighbor"),
                            case(
                                (
                                    col(vmxfp_db_models.FileContent.id)
                                    != col(neighbor_query_cte.c.id),
                                    neighbor_query_cte.c.id,
                                ),
                                else_=null(),
                            ).label("neighbor_from"),
                            query_cte_alias,
                        )
                        .select_from(query_cte, neighbor_query_cte)
                        .join(
                            neighbor_query_cte,
                            col(neighbor_query_cte.c.id) == col(query_cte.c.content_id),
                        )
                        .join(
                            vmxfp_db_models.FileContent,
                            col(vmxfp_db_models.FileContent.id)
                            == any_(neighbor_query_cte.c.neighbor_ids),
                        )
                        .order_by(
                            col(vmxfp_db_models.FileContent.content_number).asc()
                            if payload.order_by == SimilaritySearchOrderBy.CHUNK
                            else text("score DESC")
                        )
                    )
                    if payload.before_neighbor_count > 0
                    or payload.after_neighbor_count > 0
                    else (
                        select(  # type: ignore
                            vmxfp_db_models.FileContent,
                            query_cte.c.score,
                            false().label("is_neighbor"),
                            null().label("neighbor_from"),
                            query_cte_alias,
                        )
                        .select_from(query_cte)
                        .join(
                            vmxfp_db_models.FileContent,
                            col(vmxfp_db_models.FileContent.id)
                            == col(query_cte.c.content_id),
                        )
                    )
                )

        return cast(
            Select[tuple[vmxfp_db_models.FileEmbedding, float, bool, UUID]]
            | Select[
                tuple[
                    vmxfp_db_models.FileContent,
                    float,
                    bool,
                    UUID,
                    vmxfp_db_models.FileEmbedding,
                ]
            ],
            result_query,
        )

    def _parse_similarity_search_result(
        self,
        payload: SimilaritySearchRequest,
        db_results: (
            Sequence[tuple[vmxfp_db_models.FileEmbedding, float, bool, UUID]]
            | Sequence[
                tuple[
                    vmxfp_db_models.FileContent,
                    float,
                    bool,
                    UUID,
                    vmxfp_db_models.FileEmbedding,
                ]
            ]
        ),
    ) -> (
        list[vmxfp_db_models.FileEmbeddingRead]
        | list[vmxfp_db_models.FileContentReadWithChunkScore]
    ):
        """Parses raw similarity search results into FileEmbeddingRead.

        Args:
            results: Sequence of tuples containing FileEmbedding models and their scores

        Returns:
            List of FileEmbeddingRead models with similarity scores
        """
        match payload.when_match_return:
            case SimilaritySearchWhenMatchReturn.CHUNK:
                return self._parse_chunk_result(
                    cast(
                        Sequence[
                            tuple[
                                vmxfp_db_models.FileEmbedding,
                                float,
                                bool,
                                UUID,
                            ]
                        ],
                        db_results,
                    )
                )
            case SimilaritySearchWhenMatchReturn.CONTENT:
                return self._parse_content_result(
                    cast(
                        Sequence[
                            tuple[
                                vmxfp_db_models.FileContent,
                                float,
                                bool,
                                UUID,
                                vmxfp_db_models.FileEmbedding,
                            ]
                        ],
                        db_results,
                    )
                )

    def _parse_chunk_result(
        self,
        db_results: Sequence[tuple[vmxfp_db_models.FileEmbedding, float, bool, UUID]],
    ) -> list[vmxfp_db_models.FileEmbeddingRead]:
        """
        Parses the Similarity Search Query result into a list of FileEmbeddingRead 
        vmxfp_db_models.

        This function also parses the before and after neighbors of the chunks and
        organizes them into the before_neighbors and after_neighbors fields of the
        FileEmbeddingRead vmxfp_db_models.

        Args:
            db_results: Sequence of tuples containing FileEmbedding models \
                and their scores

        Returns:
            List of FileEmbeddingRead models with similarity scores
        """
        file_chunk_map = {
            chunk.id: vmxfp_db_models.FileEmbeddingRead(
                **chunk.model_dump(),
                score=score if not is_neighbor else None,
                before_neighbors=[],
                after_neighbors=[],
            )
            for chunk, score, is_neighbor, _ in db_results
            if not is_neighbor
        }

        chunk_result: list[vmxfp_db_models.FileEmbeddingRead] = []

        for chunk, _, is_neighbor, neighbor_from in db_results:
            chunk_id = cast(UUID, chunk.id)

            if (
                chunk_id in file_chunk_map
                and file_chunk_map[chunk_id] not in chunk_result
            ):
                chunk_result.append(file_chunk_map[chunk_id])
            elif is_neighbor:
                parent_chunk = file_chunk_map[neighbor_from]
                if (
                    parent_chunk.chunk_number is not None
                    and chunk.chunk_number is not None
                    and parent_chunk.chunk_number < chunk.chunk_number
                ):
                    if parent_chunk.after_neighbors is None:
                        parent_chunk.after_neighbors = []

                    parent_chunk.after_neighbors.append(
                        vmxfp_db_models.FileEmbeddingRead(
                            **chunk.model_dump(),
                        )
                    )
                elif (
                    parent_chunk.chunk_number is not None
                    and chunk.chunk_number is not None
                    and parent_chunk.chunk_number > chunk.chunk_number
                ):
                    if parent_chunk.before_neighbors is None:
                        parent_chunk.before_neighbors = []

                    parent_chunk.before_neighbors.append(
                        vmxfp_db_models.FileEmbeddingRead(
                            **chunk.model_dump(),
                        )
                    )

        return chunk_result

    def _parse_content_result(
        self,
        db_results: Sequence[
            tuple[
                vmxfp_db_models.FileContent,
                float,
                bool,
                UUID,
                vmxfp_db_models.FileEmbedding,
            ]
        ],
    ) -> list[vmxfp_db_models.FileContentReadWithChunkScore]:
        """
        Parses the Similarity Search Query result into a list of \
            FileContentReadWithChunkScore vmxfp_db_models.

        This function also parses the before and after neighbors of the contents and
        organizes them into the before_neighbors and after_neighbors fields of the
        FileContentReadWithChunkScore vmxfp_db_models.

        Args:
            db_results: Sequence of tuples containing FileContent models and \
                their scores

        Returns:
            List of FileContentReadWithChunkScore models with similarity scores
        """
        file_chunk_map: dict[UUID, vmxfp_db_models.FileEmbeddingRead] = {}
        root_file_content_map, file_content_map = self._map_content_result(db_results)

        content_result: list[vmxfp_db_models.FileContentReadWithChunkScore] = []
        for content, score, is_neighbor, neighbor_from, chunk in db_results:
            content_id: UUID = cast(UUID, content.id)
            item_content = file_content_map[content_id]
            if (
                content_id in root_file_content_map
                and root_file_content_map[content_id] not in content_result
            ):
                content_result.append(root_file_content_map[content_id])
            elif (
                is_neighbor and neighbor_from and neighbor_from in root_file_content_map
            ):
                parent_content = root_file_content_map[neighbor_from]
                if parent_content.after_neighbors is None:
                    parent_content.after_neighbors = []

                if parent_content.before_neighbors is None:
                    parent_content.before_neighbors = []

                if (
                    parent_content.content_number is not None
                    and item_content.content_number is not None
                    and parent_content.content_number < item_content.content_number
                    and item_content not in parent_content.after_neighbors
                ):
                    parent_content.after_neighbors.append(item_content)
                elif (
                    parent_content.content_number is not None
                    and item_content.content_number is not None
                    and parent_content.content_number > item_content.content_number
                    and item_content not in parent_content.before_neighbors
                ):
                    parent_content.before_neighbors.append(item_content)

            if item_content.match_chunks is None:
                item_content.match_chunks = []

            chunk_id = cast(UUID, chunk.id)
            if chunk_id not in file_chunk_map and chunk.content_id == content_id:
                file_chunk_map[chunk_id] = vmxfp_db_models.FileEmbeddingRead(
                    **chunk.model_dump(),
                    score=score,
                )
                item_content.match_chunks.append(file_chunk_map[chunk_id])

        return content_result

    def _map_content_result(
        self,
        db_results: Sequence[
            tuple[
                vmxfp_db_models.FileContent,
                float,
                bool,
                UUID,
                vmxfp_db_models.FileEmbedding,
            ]
        ],
    ) -> tuple[
        dict[UUID, vmxfp_db_models.FileContentReadWithChunkScore],
        dict[UUID, vmxfp_db_models.FileContentReadWithChunkScore],
    ]:
        """
        Maps the Similarity Search Query result into a dictionary of \
            FileContentReadWithChunkScore vmxfp_db_models.

        The root_file_content_map contains only the matching content \
            (is_neighbor is False)
        The file_content_map contains all the contents, matching or neighbors.

        Those maps ensure they get distributed correctly into the before_neighbors \
            and after_neighbors fields without creating new instances.

        Args:
            db_results: Sequence of tuples containing FileContent models and \
                their scores

        Returns:
            A tuple of two dictionaries.
        """
        root_file_content_map: dict[
            UUID, vmxfp_db_models.FileContentReadWithChunkScore
        ] = {}
        file_content_map: dict[UUID, vmxfp_db_models.FileContentReadWithChunkScore] = {}

        for content, _, is_neighbor, _, _ in db_results:
            content_id: UUID = cast(UUID, content.id)
            if content_id in file_content_map:
                continue

            item_content = vmxfp_db_models.FileContentReadWithChunkScore(
                **content.model_dump(),
                match_chunks=[],
                before_neighbors=[],
                after_neighbors=[],
            )

            if not is_neighbor:
                root_file_content_map[content_id] = item_content

            file_content_map[content_id] = item_content

        return root_file_content_map, file_content_map
