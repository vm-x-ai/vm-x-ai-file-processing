# ECR & KMS Infrastructure

This package demonstrates how to provision a secure, multi-account AWS Elastic Container Registry (ECR) architecture with KMS encryption using AWS CDK and Nx. It is designed for scalable, cross-account container image storage and sharing in cloud-native environments.

## Architecture Overview

- **KMS Key Stack:**
  - Provisions a dedicated KMS key for ECR repository encryption.
  - Grants cross-account permissions to all relevant AWS accounts for encrypting/decrypting images.
  - Stores the KMS key ARN in SSM Parameter Store for use by other stacks and roles.
  - Creates a cross-account IAM role to allow fetching the KMS key parameter from SSM.
- **ECR Stack:**
  - Provisions multiple ECR repositories (one per service/component).
  - Each repository is encrypted with the shared KMS key.
  - Grants push/pull permissions to all relevant AWS accounts (enabling multi-account CI/CD and deployment).
  - Stores repository ARNs, names, and URIs in SSM Parameter Store for easy discovery and integration.

## Key Benefits

- Centralized, secure container image storage.
- Fine-grained, cross-account access for CI/CD and deployment.
- All resource identifiers and secrets are discoverable via SSM.

## Usage

This example is intended for learning and as a template for your own infrastructure projects. It is not meant to be imported as a runtime dependency.

### Build

```bash
pnpm nx build infra-ecr
```

### Deploy

```bash
pnpm nx run infra-ecr:cdk-deploy
```

## Project Structure

- `src/main.ts`: CDK app entry point, deploys ECR and KMS stacks
- `src/stacks/ecr-stack.ts`: Defines ECR repositories and permissions
- `src/stacks/ecr-key-stack.ts`: Defines the KMS key for encryption and cross-account access

## Requirements

- AWS credentials and permissions to deploy infrastructure
- Nx and pnpm installed
- Node.js (see repository root for version)
