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

#### Update Shared Services Account ID

Update the `SHARED_SERVICES_ACCOUNT_ID` in the `.env` file with your AWS account ID.

#### Docker Login

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [SHARED_SERVICES_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
```

#### Docker Build and Push

##### Build and Push

```bash
pnpm nx run-many -t docker-build -c dev --tag "latest" --exclude 'tag:no-docker-build:dev'
pnpm nx run-many -t docker-push -c dev --tag "latest" --exclude 'tag:no-docker-build:dev'
```

#### Deploy Applications (Infra)

```bash
pnpm nx run api:cdk-deploy:dev
pnpm nx run workflow-ingestion:cdk-deploy:dev
pnpm nx run workflow-evaluation:cdk-deploy:dev
pnpm nx run workflow-worker:cdk-deploy:dev
pnpm nx run ui:cdk-deploy:dev
```

#### Helm Deploy

If you configured the ArgoCD (GitOps) the application will be deployed automatically.

But if you are not using GitOps, you can deploy the applications manually using the following commands:

```bash
pnpm nx run-many -t helm-deploy -c local --tag "latest"
```

#### Access Applications

Open the browser and navigate to the applications:

- API OpenAPI Docs: https://[ISTIO_GATEWAY_DNS_NAME]/api/docs
- UI: https://[ISTIO_GATEWAY_DNS_NAME]/ui
- Temporal UI: https://[ISTIO_GATEWAY_DNS_NAME]/temporal

### Aurora Database Tunnel

Export the AWS profile:

```bash
export AWS_PROFILE=<your-profile>
```

Start the SSM session from the bastion host to the database:

```bash
pnpm db-tunnel --aws-profile <your-profile> --stage dev --local-port 5434
```

## ECR

Docker Login:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [SHARED_SERVICES_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
```
