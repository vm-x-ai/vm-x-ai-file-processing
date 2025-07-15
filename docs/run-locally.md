# Run Locally

## Prerequisites

You will need the following tools installed on your machine:

- Node.js (v20+) ([NVM](https://github.com/nvm-sh/nvm) recommended)
- [PNPM](https://pnpm.io/installation) Node.js package manager
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) AWS command line tool
- [Docker](https://docs.docker.com/desktop/setup/install/mac-install/) Docker container runtime
- [ngrok](https://ngrok.com/docs/getting-started/) Local development tool for exposing local services to the internet
- [UV](https://docs.astral.sh/uv/getting-started/installation/) Python package manager

## Quick Start

Run the following command to bootstrap the application:

```bash
pnpm run bootstrap
```

This will guide you through the setup process.

After the bootstrap process is complete, you can start the application by running the following command:

```bash
pnpm run serve
```

This will start the application and you can access the UI at http://localhost:3002/ui.

## Deploy to Minikube

Deploy the entire stack to your local Minikube cluster.

Benefits:

- Simulate a more realistic environment
- No need to have AWS credentials
- No costs

Please follow this [guide](./run-minikube.md)

## Deploy to AWS

Deploy this entire stack to your AWS account, please follow this [guide](./run-aws.md)

## Manual Setup

If you want to setup the application manually, you can follow the steps below.

### OpenAI API Key

You will need an OpenAI API key to run the application. You can get one from the [OpenAI website](https://platform.openai.com/account/api-keys).

### Install Dependencies

This project is a multi-language monorepo, so, we need to install the Node.js and Python dependencies.

Install the Node.js dependencies:

```bash
pnpm install
```

Install the Python dependencies:

```bash
uv sync
```

### Create a VM-X Workspace

We need to create a VM-X account and workspace to run the application.

#### Create a VM-X Account

- Access the [VM-X Plans](https://vm-x.ai/plans) page (choose the "Beta" plan for free)
- Fill the form with your information or use the "Sign up with Google" button
- You will be redirected to the [VM-X Getting Started](https://console.vm-x.ai/getting-started) page.

#### Create a VM-X Workspace

- Give a name to your workspace and environment.
- Wait for the API Key to be created and copy to somewhere safe.
- Click on "Done" to finish the initial setup.
- You will be redirected to the **LLM provider integration** page, paste your OpenAI Key and click on "Save" to finish the LLM provider integration.
- A dialog will appear with the "Workspace ID" and "Environment ID" in the **OpenAI Completion API Adapter**. Copy them.

### Local Development

**IMPORTANT:** Make sure you have the docker running and the ngrok client installed.

#### Docker Containers

Let's start by running the service dependencies, such as Temporal, Postgres and Localstack.

- **Temporal**: We use Temporal to orchestrate the workflows.
- **Postgres**: We use Postgres to store the data.
- **Localstack**: We use Localstack to mock the AWS services.

#### Start Docker Compose

Let's start the Docker Compose services.

```bash
docker compose -f docker-compose.yml up -d
```

This will mock the AWS services, so, you don't need to have AWS credentials to run the application.

#### Start Ngrok

Please make sure you created a static ngrok domain in the [ngrok dashboard](https://dashboard.ngrok.com/domains).

```bash
ngrok http --url=<STATIC_DOMAIN> 8000
```

**NOTE:** Make sure you're authenticated with ngrok.

Copy the ngrok url

**IMPORTANT:** VM-X sends HTTP requests to the API when the workflow evaluations are completed, so, we need to expose our local API to the internet.

#### Add Environment Variables files

You will need to add the following environment variables files to some of the projects.

#### Workflow Worker

This project is responsible for the ingestion and evaluation workflows.

`packages/workflows/worker/.env.local`

```bash
# Local Database
DB_USER=app
DB_PASSWORD=app
DB_HOST=localhost
DB_RO_HOST=localhost
DB_PORT=5433
DB_NAME=ingestion
TEMPORAL_HOST=localhost:7233

# Used for Embedding
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>

# Used for LLM Calls
VMX_DOMAIN=us-east-1.vm-x.ai
VMX_API_KEY=<YOUR_VMX_API_KEY>
VMX_WORKSPACE_ID=<YOUR_VMX_WORKSPACE_ID>
VMX_ENVIRONMENT_ID=<YOUR_VMX_ENVIRONMENT_ID>
VMX_RESOURCE_ID=openai-default

# S3 Buckets
# <RESOURCE_PREFIX>-file-thumbnail-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
THUMBNAIL_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-file-thumbnail-000000000000-us-east-1-local"
# <RESOURCE_PREFIX>-ingestion-landing-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
LANDING_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-ingestion-landing-000000000000-us-east-1-local"

# Evaluation Callback URL
INGESTION_CALLBACK_URL=<YOUR_NGROK_URL>/ingestion-callback

# Event Bus Name
# <RESOURCE_PREFIX>-event-bus-<STAGE>
# The Pydantic settings will resolve the Jinja templates
EVENT_BUS_NAME="{{ RESOURCE_PREFIX }}-event-bus-local"
```

#### API

`packages/apps/api/.env.serve.local`

```bash
DB_USER=app
DB_PASSWORD=app
DB_HOST=localhost
DB_RO_HOST=localhost
DB_PORT=5433
DB_NAME=ingestion

TEMPORAL_HOST=localhost:7233

# Used for Embedding
OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>

# S3 Buckets
# <RESOURCE_PREFIX>-ingestion-landing-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
LANDING_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-ingestion-landing-us-east-1-local"

# Localstack S3 Endpoint
AWS_ENDPOINT_URL_S3=http://localhost.localstack.cloud:4566
```

#### UI

`packages/apps/ui/.env.local`

```bash
VMX_DOMAIN=us-east-1.vm-x.ai
VMX_PROTOCOL=https
VMX_API_KEY=<YOUR_VMX_API_KEY>
VMX_WORKSPACE_ID=<YOUR_VMX_WORKSPACE_ID>
VMX_ENVIRONMENT_ID=<YOUR_VMX_ENVIRONMENT_ID>
VMX_RESOURCE=default

NEXT_PUBLIC_API_URL=http://localhost:8000/api

```

#### Apply Database Migrations

Let's create all the database tables to our local Postgres database.

```bash
pnpm nx run py-db-models:migrations-apply:local
```

### Infrastructure

#### Bootstrap CDK Stack

This project uses CDK as the infrastructure as code tool, and the first step is to bootstrap the CDK stack.

**NOTE:** This is only needed once, or when you delete the localstack container.

```bash
pnpm nx run infra-events:cdk-bootstrap:local
```

#### Deploy Local Infrastructure

```bash
pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-infra
```

##### Deploy the Workflow Infra

```bash
pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-workflow-infra
```

#### Start the Workflow Worker

```bash
pnpm nx run workflow-worker:serve
```

#### Start the API

```bash
pnpm nx run api:serve
```

#### Start Ingestion Workflow SQS Consumer

```bash
pnpm nx run workflow-ingestion:serve
```

#### Start Evaluation Workflow SQS Consumer

```bash
pnpm nx run workflow-evaluation:serve
```

#### Start the UI

```bash
pnpm nx run ui:dev
```

#### Useful URLs:

- [Temporal UI](http://localhost:8080/)
- [UI](http://localhost:3002/ui)
- [API OpenAPI Spec](http://localhost:8000/docs)

#### Local Database Details

- Host: `localhost`
- Port: `5433`
- Database: `ingestion`
- Username: `app`
- Password: `app`
