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
    - Each project's CDK stack is responsible for dynamically creating its own ArgoCD `Application` resource during deployment. This means the definition and lifecycle of each core app's ArgoCD application is managed as part of that app's infrastructure code, not as static YAMLs in this shared module.
    - The shared module may still provide supporting manifests and resources that are platform-wide or cross-cutting, but the responsibility for core app ArgoCD applications is now decentralized to each app's stack.
  - **Shared infrastructure and services:**
    - Resources like `temporal-app.yaml`, `temporal-gateway.yaml`, and `argocd-gateway.yaml` may still be defined here to deploy shared services and ingress/gateway resources.
  - **Centralized secrets management:**
    - Files like `app-secrets.yaml` and `app-vmx-secrets.yaml` use the Secrets Store CSI driver to provision and sync secrets from AWS Secrets Manager and SSM into Kubernetes, making them available to all platform components that need them.
  - This approach ensures:
    - **Consistency:** All environments and projects use the same configuration for core services, secrets, and ingress.
    - **Reusability:** Shared resources (like Grafana, Temporal, or global secrets) are defined once and reused by all apps and workflows.
    - **Separation of concerns:** App-specific deployment logic stays in each project, while platform-wide or cross-cutting resources are managed centrally.
    - **Scalability:** New apps or workflows can be added by updating their own CDK stack to create the necessary ArgoCD `Application` resource, referencing their own repo/folder.

  **Example:**

  - The API service's CDK stack creates an ArgoCD Application resource dynamically, referencing its own `argocd` folder and configuration.
  - `temporal-app.yaml` (if present) deploys the Temporal orchestration platform, which is used by all workflows.
  - `app-secrets.yaml` and `app-vmx-secrets.yaml` ensure that all platform components have access to the secrets they need, managed securely and consistently.

  In summary: This shared ArgoCD module is the central hub for deploying, configuring, and securing all major platform shared services and infrastructure, while project-level `argocd` folders and CDK stacks are now responsible for defining and managing their own ArgoCD Application resources for deployment.

---
