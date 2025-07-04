# Shared CDK Infrastructure Module

This package provides shared infrastructure constructs and utilities for use across multiple cloud-native modules in the platform. It is designed to promote code reuse, consistency, and best practices in infrastructure as code (IaC) projects.

## Architecture

- **Reusable Constructs:** Common CDK patterns and utilities for AWS infrastructure.
- **Centralized Config:** Shared configuration and environment management.
- **Integration:** Used by other infra modules (EKS, database, network, etc.).

## Features

- Shared VPC, IAM, and security constructs
- Environment-aware configuration
- Utilities for cross-module integration

## Usage

1. Add this module as a dependency in your CDK or IaC project.
2. Import and use shared constructs in your infrastructure stacks.
3. Customize configuration as needed for your environment.

## Requirements

- AWS CDK
- Node.js & pnpm (for development)

## Project Structure

```text
packages/infra/cdk/shared/
├── src/                # Shared CDK constructs and utilities
├── package.json        # Package metadata
├── tsconfig.json       # TypeScript config
└── ...
```

## Extensibility & Community

Contributions are encouraged! Please open issues or PRs for enhancements or fixes. This module is open-source and community-driven.

## Example Usage

Below is a real example from the `infra-eks` module, which uses the `getStages` utility from this shared package to manage environment configuration for AWS EKS deployments:

```ts
// packages/infra/eks/src/main.ts
import { getStages } from '@vmxfp/infra-cdk-shared';
import * as cdk from 'aws-cdk-lib';
import { EKSStack } from './stacks/eks-stack.js';

const app = new cdk.App();
for (const stage of getStages(app.node.tryGetContext('stage') ?? 'dev')) {
  if (!stage.adminRoleArn) {
    continue;
  }

  const baseParams = {
    stage: stage.stageName,
    env: {
      account: stage.accountId,
      region: stage.region,
    },
  };

  new EKSStack(app, `vmxfp-eks-cluster-${stage.stageName}`, {
    ...baseParams,
    adminRoleArn: stage.adminRoleArn,
    ecrAccountId: getStages('shared')[0].accountId,
    ecrRepositoryPrefix: `vmxfp-`,
  });
}
```

This pattern allows all infrastructure modules to share consistent environment and account configuration, improving maintainability and reducing duplication.

### Example Explanation

- **What is `getStages`?**

  - `getStages` is a utility exported from this shared module that provides a list of environment configurations ("stages") such as `dev`, `prd`, and `shared`. Each stage includes AWS account IDs, regions, role ARNs, and other environment-specific settings.

- **How is it used in `infra-eks`?**

  - In the `infra-eks` project, `getStages` is called to retrieve all configured deployment environments. The code loops through each stage, and for each one, it creates a new EKS (Elastic Kubernetes Service) stack with the appropriate AWS account, region, and admin role.
  - This enables automated, repeatable deployments to multiple environments (e.g., development, production) with a single codebase and consistent configuration.

- **Why is this beneficial?**

  - Centralizing environment configuration in the shared module ensures that all infrastructure projects use the same definitions for accounts, regions, and roles. This reduces duplication, prevents configuration drift, and makes it easy to add or update environments in one place.
  - It also enables new infrastructure modules to be created quickly, as they can import and use the same environment logic without re-implementing it.

- **How can other modules use it?**
  - Any infrastructure module can import `getStages` (or other shared utilities) to access the same environment data, ensuring consistency across the platform.

---
