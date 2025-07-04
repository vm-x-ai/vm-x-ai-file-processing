# ArgoCD Infrastructure Module

This package provides reusable infrastructure as code (IaC) components for deploying and managing ArgoCD on Kubernetes clusters. It is designed for modular, cloud-native environments and integrates seamlessly with other infrastructure modules in the platform.

## Architecture

- **Cloud-Native:** Built for Kubernetes, supporting GitOps workflows with ArgoCD.
- **Modular:** Can be composed with other infra modules (EKS, networking, secrets, etc.).
- **Extensible:** Easily adapted for different environments and organizational needs.

## Features

- Automated ArgoCD installation and configuration
- Secure integration with Kubernetes RBAC and secrets
- Supports multi-environment deployments (dev, staging, prod)
- GitOps-ready: declarative, version-controlled infrastructure

## Usage

1. Add this module as a dependency in your infrastructure project.
2. Configure ArgoCD settings via environment variables or IaC parameters.
3. Deploy using your preferred CDK or IaC tool.

## Requirements

- Kubernetes cluster (EKS or compatible)
- Node.js & pnpm (for development)
- AWS CLI (for cloud deployments)

## Project Structure

```text
packages/infra/argocd/
├── src/                # Source code for ArgoCD IaC constructs
├── dev/                # Development environment configs
├── package.json        # Package metadata
├── tsconfig.json       # TypeScript config
└── ...
```

## Extensibility & Community

Contributions are welcome! Please open issues or PRs for new features, bug fixes, or improvements. This module is designed for open-source, community-driven development.

## Project-Level vs. Shared ArgoCD Folders

You may notice `argocd` folders both at the root of individual projects (such as `packages/apps/ui/argocd/`) and in this shared infrastructure module. This distinction is intentional:

- **Project-Level ArgoCD Folders:**

  - Contain ArgoCD application manifests and configuration specific to a single app or service (e.g., UI, API).
  - Used to manage deployment, configuration, and GitOps for that particular project only.

- **Shared ArgoCD Module (this package):**

  - Contains ArgoCD application manifests and supporting resources that are shared across the platform or critical for cross-project orchestration and infrastructure.
  - **Core platform applications:**
    - Files like `api-app.yaml`, `ui-app.yaml`, `ingestion-workflow-app.yaml`, `evaluation-workflow-app.yaml`, and `temporal-worker-app.yaml` define ArgoCD `Application` resources for each major app or workflow, referencing their own project-level `argocd` folders. This enables GitOps-driven deployment and management of all major platform components from a single, central location.
  - **Shared infrastructure and services:**
    - `temporal-app.yaml` deploys the Temporal orchestration platform (including its UI and backend) for use by all workflows and services.
    - `temporal-gateway.yaml` and `argocd-gateway.yaml` define Istio `Gateway` and `VirtualService` resources for routing traffic to shared services like Temporal UI and ArgoCD UI.
  - **Centralized secrets management:**
    - `app-secrets.yaml` and `app-vmx-secrets.yaml` use the Secrets Store CSI driver to provision and sync secrets from AWS Secrets Manager and SSM into Kubernetes, making them available to all platform components that need them.
  - This approach ensures:
    - **Consistency:** All environments and projects use the same configuration for core services, secrets, and ingress.
    - **Reusability:** Shared resources (like Grafana, Temporal, or global secrets) are defined once and reused by all apps and workflows.
    - **Separation of concerns:** App-specific deployment logic stays in each project, while platform-wide or cross-cutting resources are managed centrally.
    - **Scalability:** New apps or workflows can be added by simply creating a new ArgoCD `Application` manifest here, referencing their own repo/folder.

  **Example:**

  - `api-app.yaml` defines an ArgoCD Application that deploys the API service by referencing its own `argocd` folder.
  - `temporal-app.yaml` deploys the Temporal orchestration platform, which is used by all workflows.
  - `app-secrets.yaml` and `app-vmx-secrets.yaml` ensure that all platform components have access to the secrets they need, managed securely and consistently.

  In summary: This shared ArgoCD module is the central hub for deploying, configuring, and securing all major platform services and shared infrastructure, while project-level `argocd` folders remain focused on app-specific logic.

---
