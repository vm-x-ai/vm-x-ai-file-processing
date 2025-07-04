# VM-X AI Example Apps

## Getting Started

### Prerequisites

You will need the following tools installed on your machine:

- Node.js (v20+) ([NVM](https://github.com/nvm-sh/nvm) recommended)
- [PNPM](https://pnpm.io/installation) Node.js package manager
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) AWS command line tool
- [Docker](https://docs.docker.com/desktop/setup/install/mac-install/) Docker container runtime
- [ngrok](https://ngrok.com/docs/getting-started/) Local development tool for exposing local services to the internet
- [UV](https://docs.astral.sh/uv/getting-started/installation/) Python package manager

### Install Dependencies

Install the Node.js dependencies:

```bash
pnpm install
```

Install the Python dependencies:

```bash
uv sync
```

### Local Development

#### Docker Containers

##### Start Temporal Containers

```bash
pnpm nx run workflow-worker:docker-compose-up
```

##### Start App Containers

```bash
pnpm nx run api:docker-compose-up
```

##### Start Localstack Container

```bash
docker compose -f docker-compose.yml up -d
```

#### Start Ngrok

Please make sure you created a static ngrok domain in the [ngrok dashboard](https://dashboard.ngrok.com/domains).

```bash
ngrok http --url=<STATIC_DOMAIN> 8000
```

**NOTE:** Make sure you're authenticated with ngrok.

Copy the ngrok url

#### Add Environment Variables files

`packages/workflows/ingestion/.env.local`

Copy the content from the [1Password note](https://share.1password.com/s#7jQbyl8p8zb3s0slhANUhZnVCil8R9cDuvO7q7r7_oY)

Update the `INGESTION_CALLBACK_URL` with your ngrok url.

`packages/apps/api/.env.local`

Copy the content from the [1Password note](https://share.1password.com/s#MSMPfyoPU97KKD-WB-I4mRuZKYF6MCuSHHtXoJ1_Cco)

`packages/apps/ui/.env.local`

Copy the content from the [1Password note](https://share.1password.com/s#u54oTXSFlwU06wvLqQ7SCyaMj0lmCAHtyCIbU806wXI)

#### Apply Database Migrations

```bash
pnpm nx run py-db-models:migrations-apply:local
```

#### Start the Workflow Worker

```bash
pnpm nx run workflow-worker:serve
```

#### Start the Application

```bash
pnpm nx run api:serve
```

#### Infrastructure

##### Bootstrap CDK

```bash
pnpm nx run infra-events:cdk-bootstrap:local
```

##### Deploy Event Bus

```bash
pnpm nx run infra-events:cdk-deploy:local
```

##### Deploy the Ingestion Workflow Infra

```bash
pnpm nx run workflow-ingestion:cdk-deploy:local
```

##### Start Ingestion Workflow SQS Consumer

```bash
pnpm nx run workflow-ingestion:serve
```

##### Deploy the Evaluation Workflow Infra

```bash
pnpm nx run workflow-evaluation:cdk-deploy:local
```

##### Start Evaluation Workflow SQS Consumer

```bash
pnpm nx run workflow-evaluation:serve
```

### Start the UI

```bash
pnpm nx run ui:dev
```

Useful URLs:

- [Temporal UI](http://localhost:8080/)
- [UI](http://localhost:3002/)
- [API OpenAPI Spec](http://localhost:8000/docs)

Local Database Details:

- Host: `localhost`
- Port: `5433`
- Database: `ingestion`
- Username: `app`
- Password: `app`

## Aurora Database Tunnel

Export the AWS profile:

```bash
export AWS_PROFILE=<your-profile>
```

Start the SSM session from the bastion host to the database:

```bash
aws ssm start-session \
--target $(aws ssm get-parameter --name /vmxfp-app/dev/bastion-host/instance-id --query 'Parameter.Value' --output text) \
--document-name AWS-StartPortForwardingSessionToRemoteHost \
--parameters "{
  \"host\": [\"$(aws ssm get-parameter --name /vmxfp-app/dev/database/endpoint --query 'Parameter.Value' --output text)\"],
  \"portNumber\": [\"$(aws ssm get-parameter --name /vmxfp-app/dev/database/port --query 'Parameter.Value' --output text)\"],
  \"localPortNumber\": [\"5433\"]
}"
```

## ECR

Docker Login:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin XXXXXXXXXXXX.dkr.ecr.us-east-1.amazonaws.com
```
