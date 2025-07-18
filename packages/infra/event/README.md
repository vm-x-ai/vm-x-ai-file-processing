# AWS EventBridge Infrastructure

This package demonstrates how to provision AWS EventBridge infrastructure using AWS CDK and Nx. It creates an EventBridge event bus for each deployment stage (e.g., dev, prod), serving as a reference for event-driven architecture in real-world projects.

## Features

- AWS CDK (TypeScript) infrastructure-as-code
- Deploys an EventBridge event bus per stage
- Integrates with shared stage/environment logic
- Managed and orchestrated via Nx

## Usage

This example is intended for learning and as a template for your own infrastructure projects. It is not meant to be imported as a runtime dependency.

### Build

```bash
pnpm nx build infra-events
```

### Deploy

```bash
pnpm nx run infra-events:cdk-deploy
```

## Project Structure

- `src/main.ts`: CDK app entry point, deploys a stack for each stage
- `src/stacks/events-stack.ts`: Defines the EventBridge event bus stack

## Requirements

- AWS credentials and permissions to deploy infrastructure
- Nx and pnpm installed
- Node.js (see repository root for version)

## Running unit tests

Run `nx test infra-events` to execute the unit tests via [Vitest](https://vitest.dev/).
