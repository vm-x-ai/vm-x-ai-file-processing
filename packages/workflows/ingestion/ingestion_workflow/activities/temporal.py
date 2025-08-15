from workflow_shared_actitivies.activity_meta import TemporalActivityMeta

from ingestion_workflow.activities.chunk_document import ChunkDocumentActivity
from ingestion_workflow.activities.create_chunk_embeddings import (
    CreateChunkEmbeddingsActivity,
)
from ingestion_workflow.activities.load_s3_file import LoadS3FileActivity


class LoadS3FileActivityTemporal(
    LoadS3FileActivity, metaclass=TemporalActivityMeta
): ...


class CreateChunkEmbeddingsActivityTemporal(
    CreateChunkEmbeddingsActivity, metaclass=TemporalActivityMeta
): ...


class ChunkDocumentActivityTemporal(
    ChunkDocumentActivity, metaclass=TemporalActivityMeta
): ...
