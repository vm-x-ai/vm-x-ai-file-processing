# UI Application

A Next.js-based frontend application providing a modern, interactive interface for managing projects, files, evaluations, and AI-powered workflows. Integrates with the VM-X platform and backend API for seamless document processing, evaluation, and analysis.

## Key Features & Benefits

- **Modern Next.js UI:** Fast, responsive, and accessible web interface
- **Project & File Management:** Organize, upload, and browse documents by project
- **AI-Powered Evaluation:** Trigger and view LLM-based evaluations and analytics
- **Chat & Exploration:** Conversational interface for querying and exploring documents
- **Seamless Integration:** Works with FastAPI backend and VM-X platform for end-to-end workflows
- **Configurable & Extensible:** Built with TypeScript, Tailwind CSS, and modular components

## Architecture Overview

```mermaid
graph TD
  A[User] -->|Browser| B[Next.js UI]
  B -->|REST/Chat| C[API Backend]
  B -->|LLM| D[VM-X Platform]
  B -->|S3 Upload| E[S3 Storage]
  B -->|Project/File Views| F[UI Components]
```

- **Next.js UI:** Handles all user interactions, routing, and state
- **API Backend:** Provides data, upload intents, and evaluation results
- **VM-X Platform:** Processes LLM requests and evaluations
- **S3 Storage:** Stores uploaded files
- **UI Components:** Modular, reusable React components for all features

## End-to-End User Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js UI
    participant API as Backend API
    participant S3 as S3 Storage
    participant VMX as VM-X Platform

    User->>UI: 1. Navigate, select project, upload file
    UI->>API: 2. Request upload intent
    API->>UI: 3. Return pre-signed S3 URL
    UI->>S3: 4. Upload file directly
    UI->>API: 5. Trigger evaluation (optional)
    API->>VMX: 6. Send evaluation request
    VMX->>API: 7. Callback with results
    API->>UI: 8. Update evaluation status/results
    UI->>User: 9. Display analytics, chat, and insights
```

### 1. File Upload & Management

- Users select a project and upload files via the UI
- UI requests a pre-signed S3 URL from the API, then uploads directly

### 2. Evaluation & Analysis

- Users can trigger AI-powered evaluations on files
- Results and analytics are displayed in the UI
- Chat interface allows querying and exploration of project data

## Directory Structure

| Path              | Purpose                          |
| ----------------- | -------------------------------- |
| `src/app/`        | Next.js app routes and pages     |
| `src/components/` | UI and business logic components |
| `src/hooks/`      | Custom React hooks               |
| `src/store/`      | Zustand state management         |
| `src/utils/`      | Utility functions                |
| `src/types/`      | TypeScript types                 |
| `public/`         | Static assets                    |
| `infra/`          | Infrastructure as code (CDK)     |

## ArgoCD & CDK Infrastructure

This UI application uses a modern GitOps and Infrastructure-as-Code (IaC) approach for deployment and lifecycle management:

- **CDK Stack Integration:**

  - The application's infrastructure is defined using AWS CDK (Cloud Development Kit).
  - The CDK stack provisions all required cloud resources, including dynamically creating an ArgoCD `Application` resource for this UI.
  - The ArgoCD `Application` resource is created by the CDK stack, ensuring deployment configuration is always in sync with the application's infrastructure code.

- **ArgoCD Application & GitOps:**

  - The app includes an `argocd/` folder containing ArgoCD manifests and configuration specific to this service.
  - The ArgoCD `Application` resource (created by the CDK stack) points to this folder in the repository, enabling ArgoCD to manage the deployment of the UI via GitOps.
  - This ensures that any changes to the application's Kubernetes manifests or configuration are automatically deployed and reconciled by ArgoCD, providing a robust, auditable, and automated deployment pipeline.

- **Benefits:**
  - **Declarative Deployments:** All infrastructure and deployment configuration is version-controlled and reproducible.
  - **Separation of Concerns:** Application code, deployment manifests, and infrastructure provisioning are managed in a modular, maintainable way.
  - **Scalability:** New environments or changes can be rolled out by updating the CDK stack and/or ArgoCD configuration, with minimal manual intervention.

See the `infra/` directory and the `argocd/` folder for more details on infrastructure and deployment configuration.

## Main UI Routes & Components

| Route/Component                               | Description                        |
| --------------------------------------------- | ---------------------------------- |
| `/`                                           | Dashboard, project overview        |
| `/project/[projectId]`                        | Project details, file list         |
| `/project/[projectId]/files/[fileId]`         | File details, content, evaluations |
| `/project/[projectId]/evaluations`            | Evaluation management              |
| `/project/[projectId]/results`                | Analytics and reporting            |
| `/project/[projectId]/templates`              | Evaluation templates               |
| `/project/[projectId]/explore`                | AI-powered exploration/chat        |
| `/api/chat`                                   | LLM chat API endpoint              |
| `AppSidebar`, `FileCard`, `ChatMessage`, etc. | Core UI components                 |

## Technology Stack

- **Next.js 15** (React 19, SSR, App Router)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Vercel AI SDK** for LLM chat
- **OpenAPI client** for backend integration
- **Docker** for containerization
- **AWS CDK** for infrastructure

---

This UI application is the primary interface for the VM-X AI File Processing Platform, enabling organizations to manage, evaluate, and analyze documents at scale with a modern, AI-powered user experience.
