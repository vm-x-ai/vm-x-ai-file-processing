# GitHub Actions IAM & OIDC Infrastructure

This package demonstrates how to provision AWS IAM roles and an OpenID Connect (OIDC) provider for secure GitHub Actions CI/CD deployments using AWS CDK and Nx. It enables GitHub Actions workflows to assume AWS roles for deploying infrastructure or applications.

## Features

- AWS CDK (TypeScript) infrastructure-as-code
- Provisions an OIDC provider for GitHub Actions
- Creates IAM roles with fine-grained permissions for GitHub repositories
- Outputs role ARNs for use in CI/CD pipelines
- Managed and orchestrated via Nx

## Usage

This example is intended for learning and as a template for your own infrastructure projects. It is not meant to be imported as a runtime dependency.

### Build

```bash
pnpm nx build infra-github-actions
```

### Deploy

```bash
pnpm nx run infra-github-actions:cdk-deploy
```

## Project Structure

- `src/main.ts`: CDK app entry point, deploys the GitHub Actions auth stack for each stage
- `src/stacks/github-actions-auth-stack.ts`: Defines the OIDC provider and IAM roles

## Requirements

- AWS credentials and permissions to deploy infrastructure
- Nx and pnpm installed
- Node.js (see repository root for version)
