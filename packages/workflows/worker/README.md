# Workflow Orchestration Worker

This service is the central Temporal worker for orchestrating all major workflows in the platform, including data ingestion, evaluation, and automated processing. It is designed for robust, scalable, and secure execution of workflow logic, integrating with Temporal, AWS, and VM-X for AI workload management.

## Features

- **Python-based Temporal worker**: Runs and manages multiple workflows and activities.
- **Extensible architecture**: Easily add new workflows or activities.
- **Dependency injection**: Modular, testable, and configurable via containers.
- **Integrations**:
  - **VM-X**: AI routing, batching, and callback for evaluation tasks.
  - **OpenAI**: Embedding generation for file chunks.
  - **AWS**: S3 for storage, EventBridge for events, SSM/Secrets Manager for secrets, KMS for encryption.
- **Secure deployment**: Runs in EKS with least-privilege IAM, KMS, and SSM integration.
- **Local development**: Docker Compose stack for Temporal, Postgres, Elasticsearch, and UI.
- **Nx targets**: Build, test, lint, and deploy with Nx.

## Architecture

- **Entrypoint**: `workflow_worker/__main__.py` starts a Temporal worker, registering all workflows and activities.
- **Dependency Injection**: `workflow_worker/containers.py` manages resources (DB, S3, VM-X, OpenAI, etc.) using dependency-injector.
- **Configuration**: All settings and secrets are injected via environment variables, SSM, or local `.env` files (see `workflow_worker/settings.py`).
- **Infrastructure**: EKS service account with IAM policies for S3, KMS, SSM, Secrets Manager, and EventBridge (see `infra/stacks/worker-stack.ts`).
- **Local Development**: `docker-compose.yml` runs all required services for local testing.

## Workflows & Activities

- **IngestionWorkflow**: Handles file ingestion, chunking, embedding, and event emission.
- **EvaluationWorkflow**: Manages evaluation logic, including VM-X integration and callback handling.
- **UpdateEvaluationWorkflow**: Supports updating evaluation results.
- **Shared Activities**: Status updates, event emission, etc.

## Security & Secrets

- All sensitive credentials (DB, OpenAI, VM-X) are managed via AWS Secrets Manager and SSM.
- KMS keys are used for decrypting secrets, with access tightly scoped to the EKS service account.
- Kubernetes secrets are mounted via CSI in production deployments.

## Deployment

- **Kubernetes (EKS)**: Deployed via ArgoCD with a dedicated service account and secrets integration (see `argocd/templates/deployment.yaml`).
- **Docker Compose**: For local development and testing (`docker-compose.yml`).
- **Nx**: Build, test, lint, and deploy targets for CI/CD (`project.json`).

## Configuration

- All major settings (S3 buckets, event bus, callback URLs, API keys) are configurable via environment variables or SSM (see `workflow_worker/settings.py`).
- Example environment variables: `OPENAI_API_KEY`, `VMX_API_KEY`, `LANDING_S3_BUCKET_NAME`, `EVENT_BUS_NAME`, etc.

## Usage

### Run Locally

```bash
pnpm nx run workflow-worker:serve
```

### Build

```bash
pnpm nx build workflow-worker
```

### Test

```bash
pnpm nx test workflow-worker
```

### Deploy (CDK)

```bash
pnpm nx run workflow-worker:cdk-deploy
```

## Project Structure

- `workflow_worker/`: Main application code (entrypoint, DI, settings)
- `infra/`: AWS CDK infrastructure (EKS, IAM, SSM, KMS, etc.)
- `argocd/`: Kubernetes deployment manifests
- `docker-compose.yml`: Local development stack
- `tests/`: Unit and integration tests

## ArgoCD & CDK Infrastructure

This workflow orchestration worker uses a modern GitOps and Infrastructure-as-Code (IaC) approach for deployment and lifecycle management:

- **CDK Stack Integration:**

  - The application's infrastructure is defined using AWS CDK (Cloud Development Kit).
  - The CDK stack provisions all required cloud resources, including dynamically creating an ArgoCD `Application` resource for this worker.
  - The ArgoCD `Application` resource is created by the CDK stack, ensuring deployment configuration is always in sync with the application's infrastructure code.

- **ArgoCD Application & GitOps:**

  - The app includes an `argocd/` folder containing ArgoCD manifests and configuration specific to this service.
  - The ArgoCD `Application` resource (created by the CDK stack) points to this folder in the repository, enabling ArgoCD to manage the deployment of the worker via GitOps.
  - This ensures that any changes to the application's Kubernetes manifests or configuration are automatically deployed and reconciled by ArgoCD, providing a robust, auditable, and automated deployment pipeline.

- **Benefits:**
  - **Declarative Deployments:** All infrastructure and deployment configuration is version-controlled and reproducible.
  - **Separation of Concerns:** Application code, deployment manifests, and infrastructure provisioning are managed in a modular, maintainable way.
  - **Scalability:** New environments or changes can be rolled out by updating the CDK stack and/or ArgoCD configuration, with minimal manual intervention.

See the `infra/` directory and the `argocd/` folder for more details on infrastructure and deployment configuration.

## Requirements

- Python 3.9+
- Nx and pnpm
- Docker (for local development)
- AWS CLI (for deployment)

## Scalability

This service is designed for robust horizontal and vertical scaling in both cloud and local environments:

- **Temporal Native Scaling:**

  - Multiple worker instances can be run in parallel, all listening on the same Temporal task queue. Temporal automatically load-balances workflow and activity tasks across all available workers.
  - Workflows and activities are stateless and idempotent, enabling safe scaling to any number of replicas.

- **Kubernetes/EKS Deployment:**

  - The worker is deployed as a stateless container in Kubernetes (EKS), allowing you to scale the number of pods up or down based on demand.
  - Resource requests and limits can be tuned for optimal performance and cost.
  - Rolling updates and self-healing are managed by Kubernetes.

- **Queue-Based Decoupling:**

  - Ingestion and evaluation pipelines are triggered by SQS/EventBridge events, decoupling event producers from consumers and enabling elastic scaling of the worker pool.
  - Backpressure is naturally handled by the queue; if demand spikes, more worker pods can be added to drain the queue faster.

- **Cloud-Native Integrations:**

  - Uses AWS managed services (S3, SQS, EventBridge, Secrets Manager, KMS) for high availability and scalability.
  - All secrets and configuration are injected at runtime, so new replicas can be started instantly without manual intervention.

- **Local Development:**
  - Docker Compose allows you to run multiple worker containers locally for testing parallelism and scaling behavior.

This architecture ensures the platform can handle large volumes of concurrent workflows and activities, with minimal operational overhead and maximum reliability.

---

This service is the backbone of workflow orchestration in the platform, providing a secure, extensible, and production-ready foundation for all automated processes.
