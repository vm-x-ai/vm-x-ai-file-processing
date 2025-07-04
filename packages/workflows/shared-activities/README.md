# Shared Workflow Activities (Temporal)

This package provides reusable, stateless Temporal activities for common workflow operations, such as updating file status and emitting events. These activities are designed to be used across multiple workflow modules (e.g., ingestion, evaluation) to ensure consistency, reduce code duplication, and enable scalable, event-driven architectures.

## Key Activities

### SendEventActivity

| Parameter  | Type | Description                                                   |
| ---------- | ---- | ------------------------------------------------------------- |
| source     | str  | Logical source of the event (e.g., 'ingestion', 'evaluation') |
| event_type | str  | Event type (e.g., 'file_ingested_successfully')               |
| data       | dict | Event payload (arbitrary JSON-serializable data)              |

- Publishes structured events to an AWS EventBridge event bus.
- Used to notify other systems or trigger downstream processes (e.g., file ingested, evaluation completed, error occurred).
- Events include a timestamp and are fully decoupled from workflow execution.
- Implements robust, async event publishing using aioboto3.

### UpdateFileStatusActivity

| Parameter | Type | Description                               |
| --------- | ---- | ----------------------------------------- |
| file_id   | UUID | Unique identifier of the file             |
| status    | enum | New file status (e.g., COMPLETED, FAILED) |

- Updates the status of a file in the database.
- Ensures consistent status management across all workflow modules.
- Promotes DRY principles and reliable state transitions.

## Architecture & Extensibility

- Activities are implemented as stateless Python classes with Temporal activity definitions.
- Designed for dependency injection (e.g., AWS clients, repositories) for testability and modularity.
- Safe for horizontal scaling and parallel execution.
- Easily extended with additional shared activities (e.g., notifications, logging, auditing).

## Integration & Usage

- Used by both ingestion and evaluation workflows to update file status and emit events.
- Promotes decoupling and consistent workflow behavior across the platform.
- Example usage in a workflow:

```python
await workflow.execute_activity(
    SendEventActivity.run,
    args=["ingestion", "file_ingested_successfully", {"file_id": file_id}],
    ...
)
```

## Scalability & Cloud-Native Patterns

- Activities are stateless and idempotent, enabling safe parallel execution and horizontal scaling.
- EventBridge integration enables scalable, decoupled event-driven architectures.
- All AWS credentials and configuration are injected at runtime for secure, cloud-native operation.

## Build & Test

### Build

```bash
pnpm nx build workflow-shared-activities
```

### Test

```bash
pnpm nx test workflow-shared-activities
```

## Project Structure

- `workflow_shared_actitivies/`: Shared activity implementations
- `tests/`: Unit and integration tests

## Requirements

- Python 3.9+
- Nx and pnpm
- Temporal server (local or cloud)
- AWS credentials for EventBridge

---

This package is the foundation for consistent, scalable, and event-driven workflow operations across the platform.
