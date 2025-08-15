# Deploy to AWS (Serverless Version)

The Serverless version uses the following stack:

- API Gateway (HTTP Endpoint)
- Lambda Functions (FastAPI, Workflow Ingestion, Workflow Evaluation)
- SQS Queue
- S3 Bucket
- AWS Step Functions State Machine.
- Aurora Database or Nean Dababase (If you want to be as cost effective as possible)

## AWS Account Setup

This project requires one AWS account:

1. **Development Account**: Contains the application infrastructure like API Gateway, Lambda Functions, SQS Queue, S3 Bucket, AWS Step Functions State Machine, and Aurora Database.

## Update Resource Prefix (Optional)

By default, the resource prefix is `file-processing`, and it's used across the entire project (AWS resources, ArgoCD, etc.).

You can change it by updating the `RESOURCE_PREFIX` in the root `.env` file.

## Update the AWS Account IDs

Update the `packages/infra/cdk/shared/src/consts/stages.ts` with your AWS accounts information.

## Update root .env STACK_MODE

Update the `STACK_MODE` in the root `.env` file to `serverless` or `serverless-neon` (if you are using Neon Database).

## CDK Bootstrap

```bash
pnpm nx run infra-events:cdk-bootstrap:dev
```

## Deploy Event Bus

```bash
pnpm nx run infra-events:cdk-deploy:dev
```

## Deploy Secret KMS Key

```bash
pnpm nx run infra-secrets:cdk-deploy:dev
```

## Add Secrets

Update the following file `secrets/secrets/dev.yaml` as follows:

```yaml
kms:
  arn: !cf_output secrets-kms-dev.KeyArn
parameters: []
secrets:
  - name: openai-credentials
    description: OpenAI credentials
    value: |
      {
        "api_key": "<YOUR_OPENAI_API_KEY>"
      }

  - name: vmx-credentials
    description: VMX credentials
    value: |
      {
        "domain": "us-east-1.vm-x.ai",
        "api_key": "<YOUR_VMX_API_KEY>",
        "workspace_id": "<YOUR_VMX_WORKSPACE_ID>",
        "environment_id": "<YOUR_VMX_ENVIRONMENT_ID>",
        "resource_id": "<YOUR_VMX_RESOURCE_ID>"
      }

secrets_file: ./_encrypted/dev.yaml
```

If you are using a Neon Database, you need to add the following secret:

```yaml
secrets:
  ...
  - name: <RESOURCE_PREFIX>-app-database-secret-<ENV>
    description: Database secret
    value: |
      {
        "host": "<YOUR_NEON_HOST>",
        "port": "<YOUR_NEON_PORT>",
        "dbname": "<YOUR_NEON_DBNAME>",
        "username": "<YOUR_NEON_USERNAME>",
        "password": "<YOUR_NEON_PASSWORD>",
        "engine": "postgresql"
      }
```

**IMPORTANT:** Make sure you replace the `<RESOURCE_PREFIX>` and `<ENV>` with the correct values.

## Encrypt Secrets

```bash
pnpm nx run infra-secrets:encrypt:dev
```

**IMPORTANT:** Make sure you have the [aws-ssm-secrets-cli](https://pypi.org/project/aws-ssm-secrets-cli/) installed.

## Deploy Secrets

```bash
pnpm nx run infra-secrets:deploy-secrets:dev
```

## Deploy Aurora Database (Skip if you are using Neon)

```bash
pnpm nx run infra-database:cdk-deploy:dev
```

## Apply Database Migrations

```bash
pnpm nx run py-db-models:migrations-apply:dev
```

### Deploy Applications

#### Deploy Applications (Infra)

```bash
pnpm nx run-many -t cdk-deploy -c dev --projects=tag:support:serverless
```

#### Access Applications

Open the browser and navigate to the applications:

- API OpenAPI Docs: https://[LAMBDA_FUNCTION_URL]/api/docs
- UI: https://[CLOUDFRONT_URL]/ui
