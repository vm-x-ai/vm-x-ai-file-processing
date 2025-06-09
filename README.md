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

### Configure AWS CLI Profile

Add the following content to your `~/.aws/config` file:

```text
[profile dm-app-dev]
sso_start_url = https://diligencemachines.awsapps.com/start
sso_region = us-east-1
sso_account_id = 978398161683
sso_role_name = AWSAdministratorAccess
region = us-east-1
```

Run the command below to login to the AWS SSO:

```bash
aws sso login --profile dm-app-dev
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
pnpm nx run py-db-models:alembic-upgrade
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

##### Deploy the Evaluation Workflow Infra

```bash
pnpm nx run workflow-evaluation:cdk-deploy:local
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
