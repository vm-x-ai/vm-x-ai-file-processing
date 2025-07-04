# Ingestion Workflow (Temporal)

This package implements a robust, multi-step data ingestion pipeline using Temporal workflows and activities. It is designed to process files (PDF, TXT) uploaded to S3, chunk documents, generate embeddings, update file status, and emit events for downstream systems.

## How the Workflow is Started

- **File Upload:** A user uploads a file via the UI, which stores the file in S3.
- **Event Flow:**
  1. **S3 Event:** The S3 bucket emits an event when a new file is uploaded.
  2. **EventBridge:** The S3 event is routed to an EventBridge rule.
  3. **SQS:** EventBridge delivers the event to an SQS queue.
  4. **Ingestion Container:** The ingestion container (this service) long-polls the SQS queue for new messages.
  5. **Workflow Start:** When a message is received, the container starts the `IngestionWorkflow` via the Temporal API, passing the S3 event payload.
- This pattern ensures reliable, decoupled, and scalable ingestion of new files triggered by user uploads.

## Overview

- **Trigger:** S3 event (via `S3Event` schema) starts the workflow.
- **Workflow Steps:**
  1. **Load File from S3:** Downloads the file, extracts metadata, stores file/content records, and generates a PDF thumbnail if needed.
  2. **Chunk Document:** Splits file content into manageable chunks using LangChain's text splitters; stores each chunk as a `FileEmbedding` record.
  3. **Create Embeddings:** For each chunk, generates vector embeddings using OpenAI's embedding API and updates the database.
  4. **Update File Status:** Marks the file as `COMPLETED` or `FAILED` in the database.
  5. **Emit Events:** Sends success or failure events to EventBridge for integration with other systems.

## Activities

- `LoadS3FileActivity`: Handles S3 download, file record creation, and PDF thumbnail generation.
- `ChunkDocumentActivity`: Splits documents and stores chunk metadata.
- `CreateChunkEmbeddingsActivity`: Generates and stores vector embeddings for each chunk.
- Shared: `UpdateFileStatusActivity`, `SendEventActivity` (from shared-activities package).

## Error Handling

- Retries activities up to 3 times.
- On failure, updates file status and emits a failure event.

## Database Models

### File

| Field         | Type     | Description                                                                                             |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| id            | UUID     | Unique identifier for the file                                                                          |
| name          | str      | File name                                                                                               |
| type          | str      | MIME type                                                                                               |
| size          | int      | File size in bytes                                                                                      |
| url           | str      | S3 URL of the file                                                                                      |
| status        | enum     | File status (pending, chunking, chunked, embedding, embedded, evaluating, evaluated, completed, failed) |
| error         | str/null | Error message, if any                                                                                   |
| project_id    | UUID     | Associated project                                                                                      |
| thumbnail_url | str/null | S3 URL of the file thumbnail                                                                            |
| created_at    | datetime | Creation timestamp                                                                                      |
| updated_at    | datetime | Last update timestamp                                                                                   |

### FileContent

| Field            | Type     | Description                                  |
| ---------------- | -------- | -------------------------------------------- |
| id               | UUID     | Unique identifier for the file content chunk |
| file_id          | UUID     | Associated file                              |
| content_number   | int      | Chunk/page number                            |
| content_metadata | dict     | Metadata for the chunk (JSON)                |
| content          | str      | Text content of the chunk                    |
| created_at       | datetime | Creation timestamp                           |
| updated_at       | datetime | Last update timestamp                        |

### FileEmbedding

| Field          | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| id             | UUID     | Unique identifier for the embedding  |
| file_id        | UUID     | Associated file                      |
| chunk_number   | int      | Chunk number                         |
| chunk_metadata | dict     | Metadata for the chunk (JSON)        |
| project_id     | UUID     | Associated project                   |
| content_id     | UUID     | Associated file content chunk        |
| content        | str      | Text content of the chunk            |
| embedding      | vector   | Vector embedding (1536-dim)          |
| status         | enum     | Embedding status (CHUNKED, EMBEDDED) |
| created_at     | datetime | Creation timestamp                   |
| updated_at     | datetime | Last update timestamp                |

## Why FileContent and FileEmbedding?

### FileContent

- **Purpose:** Represents a logical chunk or page of a file (e.g., a page in a PDF or a section of a text file).
- **Why Needed:**
  - Large files are split into smaller, manageable pieces for processing, storage, and downstream tasks (like embedding or evaluation).
  - Enables parallel processing and more efficient retrieval (e.g., searching or displaying a single page).
  - Supports chunk-level metadata, such as page number or section info.

### FileEmbedding

- **Purpose:** Stores the vector embedding for each chunk of file content.
- **Why Needed:**
  - Embeddings are used for semantic search, similarity comparison, and AI-driven features (e.g., finding relevant content or answering questions about the file).
  - Storing embeddings at the chunk level allows for fine-grained search and retrieval, rather than treating the whole file as a single block.
  - **Embedding chunks are typically smaller than content chunks.** This allows embeddings to capture more granular semantic meaning, improves search accuracy, and ensures compatibility with embedding model token limits.
  - Supports scalable, high-performance vector search (e.g., using pgvector or similar technologies).

This separation enables scalable, efficient, and intelligent document processing and retrieval in modern AI-powered applications.

## Extensibility

- Modular activities and workflow steps for new file types, chunking strategies, or embedding models.
- Easily integrates with additional downstream systems via events.

## Usage

This example is intended for learning and as a template for your own Temporal ingestion workflows.

### Run Locally

```bash
pnpm nx run workflow-ingestion:serve
```

### Build

```bash
pnpm nx build workflow-ingestion
```

### Test

```bash
pnpm nx test workflow-ingestion
```

## Project Structure

- `ingestion_workflow/`: Workflow and activity implementations
- `activities/`: Temporal activities for each workflow step
- `tests/`: Unit and integration tests

## Requirements

- Python 3.9+
- Nx and pnpm installed
- Temporal server (local or cloud)
- AWS credentials for S3/EventBridge
