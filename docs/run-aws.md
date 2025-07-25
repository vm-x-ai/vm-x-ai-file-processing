# Deploy to AWS (Kubernetes Version)

The Kubernetes version uses the following stack:

- EKS Cluster (Kubernetes)
- RDS Database (Aurora PostgreSQL)
- Temporal Workflow Engine (Deployed in the EKS cluster)
- ArgoCD (GitOps)
- API (FastAPI Deployed in the EKS cluster)
- UI (Next.js Deployed in the EKS cluster)
- SQS Queue
- S3 Bucket
- SQS Consumers (Deployed in the EKS cluster)
  - Workflow Ingestion
  - Workflow Evaluation
- Temporal Worker (Deployed in the EKS cluster)

This version is more complex and more expensive than the Serverless version, but it's recommended for the following cases:

- You already use Kubernetes in your organization.
- The files are big and extracting require more compute and time (+15 minutes).
- You want to use the Temporal Workflow Engine.

**IMPORTANT:** Be aware that will cost money since it creates, RDS, EKS and EC2 instances.

## AWS Account Setup

This project requires two AWS accounts:

1. **Shared Services Account**: Contains shared resources like ECR repositories.
2. **Development Account**: Contains the application infrastructure like EKS cluster, RDS database, and application workloads.

## Update Resource Prefix (Optional)

By default, the resource prefix is `file-processing`, and it's used across the entire project (AWS resources, ArgoCD, etc.).

You can change it by updating the `RESOURCE_PREFIX` in the root `.env` file.

## GitOps

This project uses ArgoCD for GitOps, and it's enabled by default.

If you want to keep using GitOps, follow the steps below to update the Git details to your own.

### Update the AWS Account IDs and GitHub Repo Details

Update the `packages/infra/cdk/shared/src/consts/stages.ts` with your AWS accounts information and GitHub repo details.

If you don't want to use GitOps, you can disable it by updating the `packages/infra/cdk/shared/src/consts/stages.ts` with the following:

```ts
gitOps: {
  enabled: false,
},
```

**NOTE:** You can always enable GitOps later by updating the `packages/infra/cdk/shared/src/consts/stages.ts` with your own details.

## CDK Bootstrap

```bash
pnpm nx run infra-network:cdk-bootstrap:dev
```

## Deploy Docker Repositories

```bash
pnpm nx run infra-ecr:cdk-deploy:shared
```

**NOTE:** Make sure you have the correct AWS profile set.

## Deploy Network

```bash
pnpm nx run infra-network:cdk-deploy:dev
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

**NOTE:** If you disabled GitOps, remove the `argocd-github-token` secret.

```yaml
kms:
  arn: !cf_output secrets-kms-dev.KeyArn
parameters: []
secrets:
  - name: argocd-github-token
    description: GitHub token for ArgoCD
    value: |
      {
        "url": "https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_GITHUB_REPO_NAME>.git",
        "username": "<YOUR_GITHUB_USERNAME>",
        "password": "<YOUR_GITHUB_TOKEN>"
      }

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

## Encrypt Secrets

```bash
pnpm nx run infra-secrets:encrypt:dev
```

**IMPORTANT:** Make sure you have the [aws-ssm-secrets-cli](https://pypi.org/project/aws-ssm-secrets-cli/) installed.

## Deploy Secrets

```bash
pnpm nx run infra-secrets:deploy-secrets:dev
```

## Deploy EKS Cluster

```bash
pnpm nx run infra-eks:cdk-deploy:dev
```

## Deploy Aurora Database

```bash
pnpm nx run infra-database:cdk-deploy:dev
```

## Apply Database Migrations

```bash
pnpm nx run py-db-models:migrations-apply:dev
```

## Update ArgoCD Secrets Namespace (Optional)

In case you changed the resource prefix (default is `file-processing`), you need to update the namespace in the following files:

- `packages/infra/argocd/dev/app-secrets.yaml`
- `packages/infra/argocd/dev/app-vmx-secrets.yaml`

## Access ArgoCD

### Install Kubectl

You will need the `kubectl` CLI to run the next commands, install the `kubectl` by following the [AWS Set up kubectl and eksctl](https://docs.aws.amazon.com/eks/latest/userguide/install-kubectl.html#kubectl-install-update) guide.

### Get Istio Gateway AWS Network Load Balancer DNS name

```bash
kubectl get svc ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Get ArgoCD Admin Password

```bash
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 --decode; echo
```

**IMPORTANT:** It's strongly recommended to configure a SSO for the ArgoCD users.

### Access ArgoCD UI

Open the browser and navigate to the ArgoCD UI:

```
https://[ISTIO_GATEWAY_DNS_NAME]/argocd
```

Use the following credentials to access the ArgoCD UI:

```
username: admin
password: [ARGOCD_ADMIN_PASSWORD] (see previous section)
```

## Access Temporal UI

The Temporal UI is exposed through the same Istio Gateway as the ArgoCD UI.

### Get Temporal UI URL

```bash
kubectl get svc temporal-ui -n temporal-system -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

### Access Temporal UI

Open the browser and navigate to the Temporal UI:

```
https://[ISTIO_GATEWAY_DNS_NAME]/temporal
```

### Deploy Applications

#### Update Shared Services Account ID

Update the `SHARED_SERVICES_ACCOUNT_ID` in the `.env` file with your AWS account ID.

#### Docker Login

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [SHARED_SERVICES_ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
```

#### UI Build Environment Variables

Since this demo app doesn't have a DNS configured, we need to set the `NEXT_PUBLIC_API_URL` environment variable to the API URL using the Istio Gateway DNS name.

Create the `.env.build.dev` file with the following content:

```
NEXT_PUBLIC_API_URL=http://[ISTIO_GATEWAY_DNS_NAME]/api
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
