# Aurora PostgreSQL Infrastructure

This package demonstrates how to provision a secure, production-ready Aurora PostgreSQL database cluster using AWS CDK and Nx. It creates an Aurora cluster per deployment stage (e.g., dev, prod), with secrets, networking, and integration with EKS and bastion hosts. Use this as a reference or starting point for your own infrastructure projects.

## Features

- AWS CDK (TypeScript) infrastructure-as-code
- Aurora PostgreSQL cluster with encryption, backups, and IAM authentication
- Secrets managed in AWS Secrets Manager
- Security groups and VPC integration
- Exposes connection details via SSM Parameter Store
- Integrates with EKS and bastion host security groups
- Managed and orchestrated via Nx

## Usage

This example is intended for learning and as a template for your own infrastructure projects. It is not meant to be imported as a runtime dependency.

### Build

```bash
pnpm nx build infra-database
```

### Deploy

```bash
pnpm nx run infra-database:cdk-deploy
```

## Project Structure

- `src/main.ts`: CDK app entry point, deploys a database stack for each stage
- `src/stacks/database-stack.ts`: Defines the Aurora PostgreSQL cluster and related resources

## Requirements

- AWS credentials and permissions to deploy infrastructure
- Nx and pnpm installed
- Node.js (see repository root for version)
