#!/usr/bin/env bash

set -e

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

# Usage:
#   ./bootstrap.sh [--openai-key=KEY|--openai-key KEY] [--vmx-api-key=KEY|--vmx-api-key KEY] [--vmx-workspace-id=ID|--vmx-workspace-id ID] [--vmx-environment-id=ID|--vmx-environment-id ID] [--vmx-domain=DOMAIN|--vmx-domain DOMAIN] [--vmx-resource-id=ID|--vmx-resource-id ID] [--ngrok-domain=DOMAIN|--ngrok-domain DOMAIN] [--help]
# If any argument is omitted, the script will prompt for it interactively.

show_help() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --openai-key=KEY or --openai-key KEY           OpenAI API Key"
  echo "  --vmx-api-key=KEY or --vmx-api-key KEY         VMX API Key"
  echo "  --vmx-workspace-id=ID or --vmx-workspace-id ID VMX Workspace ID"
  echo "  --vmx-environment-id=ID or --vmx-environment-id ID VMX Environment ID"
  echo "  --vmx-domain=DOMAIN or --vmx-domain DOMAIN     VMX Domain (default: ${BOLD}us-east-1.vm-x.ai${RESET})"
  echo "  --vmx-resource-id=ID or --vmx-resource-id ID   VMX Resource ID (default: ${BOLD}openai-default${RESET})"
  echo "  --ngrok-domain=DOMAIN or --ngrok-domain DOMAIN Ngrok custom domain"
  echo "  --help                                        Show this help message and exit"
}

# Parse named arguments (support --key=value and --key value)
while [[ $# -gt 0 ]]; do
  case $1 in
    --help)
      show_help
      exit 0
      ;;
    --openai-key)
      OPENAI_API_KEY="$2"; shift 2;;
    --openai-key=*)
      OPENAI_API_KEY="${1#*=}"; shift;;
    --vmx-api-key)
      VMX_API_KEY="$2"; shift 2;;
    --vmx-api-key=*)
      VMX_API_KEY="${1#*=}"; shift;;
    --vmx-workspace-id)
      VMX_WORKSPACE_ID="$2"; shift 2;;
    --vmx-workspace-id=*)
      VMX_WORKSPACE_ID="${1#*=}"; shift;;
    --vmx-environment-id)
      VMX_ENVIRONMENT_ID="$2"; shift 2;;
    --vmx-environment-id=*)
      VMX_ENVIRONMENT_ID="${1#*=}"; shift;;
    --vmx-domain)
      VMX_DOMAIN="$2"; shift 2;;
    --vmx-domain=*)
      VMX_DOMAIN="${1#*=}"; shift;;
    --vmx-resource-id)
      VMX_RESOURCE_ID="$2"; shift 2;;
    --vmx-resource-id=*)
      VMX_RESOURCE_ID="${1#*=}"; shift;;
    --ngrok-domain)
      NGROK_DOMAIN="$2"; shift 2;;
    --ngrok-domain=*)
      NGROK_DOMAIN="${1#*=}"; shift;;
    *)
      echo "Unknown argument: $1"; show_help; exit 1;;
  esac
done

# Step 1: Check for required binaries
REQUIRED_BINS=(node pnpm docker ngrok uv)
MISSING=()
log_info "Checking required binaries..."
for bin in "${REQUIRED_BINS[@]}"; do
  if ! command -v $bin &>/dev/null; then
    log_error "$bin not found."
    MISSING+=("$bin")
  fi
done
if [ ${#MISSING[@]} -ne 0 ]; then
  log_warning "Please install the missing binaries: ${MISSING[*]}"
  exit 1
else
  log_success "All required binaries found."
fi

log_newline
# Step 2: Check if Docker is running
log_info "Checking if Docker is running..."
if ! docker info &>/dev/null; then
  log_error "Docker is not running. Please start Docker."
  exit 1
else
  log_success "Docker is running."
fi

log_newline
# Step 3: Prompt for secrets and config
log_info_bold "OpenAI API Key Setup:"
log_info_bold_inline "1. Go to **https://platform.openai.com/account/api-keys**"
log_info_bold_inline "2. Click **Create new secret key** and copy your key."
log_info "3. Save it somewhere safe—you'll need it for the next step."
log_newline
if [ -z "$OPENAI_API_KEY" ]; then
  read -p "Enter your OpenAI API key: " OPENAI_API_KEY
fi

log_newline

# Check if all VMX and ngrok arguments are provided
ALL_VMX_NGROK_SET=1
for var in VMX_API_KEY VMX_WORKSPACE_ID VMX_ENVIRONMENT_ID VMX_DOMAIN VMX_RESOURCE_ID NGROK_DOMAIN; do
  if [ -z "${!var}" ]; then
    ALL_VMX_NGROK_SET=0
    break
  fi
done

# VMX and ngrok instructions only if not all values are set
if [ $ALL_VMX_NGROK_SET -eq 0 ]; then
  log_newline
  log_info "VM-X Account & Workspace Setup:"
  log_info_bold_inline "1. Go to **https://vm-x.ai/plans** and select the Beta plan (free)."
  log_info "2. Sign up with your email or Google account."
  log_info_bold_inline "3. After signup, you'll be redirected to **https://console.vm-x.ai/getting-started**."
  log_info "4. Create a workspace (e.g., my-dev-workspace) and environment (e.g., local or dev)."
  log_info_bold_inline "5. Wait for your **API Key** to be generated. Copy and save it."
  log_info "6. You'll be redirected to the LLM provider integration page. Paste your OpenAI API Key and click Save."
  log_info_bold_inline "7. A dialog will show your **Workspace ID** and **Environment ID**. Copy and save both."
  log_newline

  log_info "You will need the following for the next steps:"
  log_info_bold_inline "- **VMX API Key** (from step 5)"
  log_info_bold_inline "- **VMX Workspace ID** (from step 7)"
  log_info_bold_inline "- **VMX Environment ID** (from step 7)"
  log_info_bold_inline "- **VMX Domain** (default: **us-east-1.vm-x.ai**)"
  log_info_bold_inline "- **VMX Resource ID** (default: **openai-default**)"
  log_newline
fi

if [ -z "$VMX_API_KEY" ]; then
  read -p "Enter your VMX API key: " VMX_API_KEY
fi
if [ -z "$VMX_WORKSPACE_ID" ]; then
  read -p "Enter your VMX Workspace ID: " VMX_WORKSPACE_ID
fi
if [ -z "$VMX_ENVIRONMENT_ID" ]; then
  read -p "Enter your VMX Environment ID: " VMX_ENVIRONMENT_ID
fi
if [ -z "$VMX_DOMAIN" ]; then
  log_prompt_bold_inline "Enter your VMX Domain [**us-east-1.vm-x.ai**]: "
  read VMX_DOMAIN
fi
VMX_DOMAIN=${VMX_DOMAIN:-us-east-1.vm-x.ai}
if [ -z "$VMX_RESOURCE_ID" ]; then
  log_prompt_bold_inline "Enter your VMX Resource ID [**openai-default**]: "
  read VMX_RESOURCE_ID
fi
VMX_RESOURCE_ID=${VMX_RESOURCE_ID:-openai-default}

log_newline

if [ $ALL_VMX_NGROK_SET -eq 0 ]; then
  log_info "Ngrok Custom Domain Setup:"
  log_info_bold_inline "- See the official guide: **https://ngrok.com/docs/universal-gateway/custom-domains/**"
  log_info "- This allows you to use your own domain (e.g., app.your-domain.com) with ngrok for a persistent, memorable endpoint."
  log_info "- Steps:"
  log_info_bold_inline "   1. In your ngrok dashboard, go to the Domains page and click **New Domain** to add your domain."
  log_info_bold_inline "   2. ngrok will provide a **CNAME** value (e.g., exampledata.otherdata.ngrok-cname.com). Copy this."
  log_info_bold_inline "   3. In your DNS provider's dashboard, create a **CNAME** record for your domain (e.g., app.your-domain.com) pointing to the value from step 2."
  log_info_bold_inline "   5. Start your tunnel with: **ngrok http --url=<YOUR_CUSTOM_DOMAIN> 8000**"
  log_info "   6. Enter your custom domain (e.g., app.your-domain.com) below."
  log_newline
fi
if [ -z "$NGROK_DOMAIN" ]; then
  read -p "Enter your ngrok custom domain (e.g. app.your-domain.com): " NGROK_DOMAIN
fi

# Write the ngrok domain to the .env file, if it's not already there
if ! grep -q "NGROK_DOMAIN" .env; then
  echo "" >> .env
  echo "# Ngrok Domain" >> .env
  echo "NGROK_DOMAIN=$NGROK_DOMAIN" >> .env
fi

NGROK_URL="https://$NGROK_DOMAIN"

log_newline
# Step 4: Generate .env files
log_info "Generating .env files..."

WORKER_ENV="packages/workflows/worker/.env.local"
API_ENV="packages/apps/api/.env.serve.local"
UI_ENV="packages/apps/ui/.env.local"

mkdir -p "$(dirname $WORKER_ENV)" "$(dirname $API_ENV)" "$(dirname $UI_ENV)"

cat > $WORKER_ENV <<EOF
# Local Database
DB_USER=app
DB_PASSWORD=app
DB_HOST=localhost
DB_RO_HOST=localhost
DB_PORT=5433
DB_NAME=ingestion
TEMPORAL_HOST=localhost:7233

# Used for Embedding
OPENAI_API_KEY=$OPENAI_API_KEY

# Used for LLM Calls
VMX_DOMAIN=$VMX_DOMAIN
VMX_API_KEY=$VMX_API_KEY
VMX_WORKSPACE_ID=$VMX_WORKSPACE_ID
VMX_ENVIRONMENT_ID=$VMX_ENVIRONMENT_ID
VMX_RESOURCE_ID=$VMX_RESOURCE_ID

# S3 Buckets
# <RESOURCE_PREFIX>-file-thumbnail-<ACCOUNT_ID>-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
THUMBNAIL_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-file-thumbnail-000000000000-us-east-1-local"
# <RESOURCE_PREFIX>-ingestion-landing-<ACCOUNT_ID>-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
LANDING_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-ingestion-landing-000000000000-us-east-1-local"

# Evaluation Callback URL
INGESTION_CALLBACK_URL=$NGROK_URL/ingestion-callback

# Event Bus Name
# <RESOURCE_PREFIX>-event-bus-<STAGE>
# The Pydantic settings will resolve the Jinja templates
EVENT_BUS_NAME="{{ RESOURCE_PREFIX }}-event-bus-local"
EOF

cat > $API_ENV <<EOF
DB_USER=app
DB_PASSWORD=app
DB_HOST=localhost
DB_RO_HOST=localhost
DB_PORT=5433
DB_NAME=ingestion

TEMPORAL_HOST=localhost:7233

# Used for Embedding
OPENAI_API_KEY=$OPENAI_API_KEY

# S3 Buckets
# <RESOURCE_PREFIX>-ingestion-landing-<ACCOUNT_ID>-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
LANDING_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-ingestion-landing-000000000000-us-east-1-local"

# Localstack S3 Endpoint
AWS_ENDPOINT_URL_S3=http://localhost.localstack.cloud:4566
EOF

cat > $UI_ENV <<EOF
VMX_DOMAIN=$VMX_DOMAIN
VMX_PROTOCOL=https
VMX_API_KEY=$VMX_API_KEY
VMX_WORKSPACE_ID=$VMX_WORKSPACE_ID
VMX_ENVIRONMENT_ID=$VMX_ENVIRONMENT_ID
VMX_RESOURCE=$VMX_RESOURCE_ID

NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

log_success ".env files generated."

log_newline
# Step 5: Install dependencies
log_info "Installing Node.js dependencies..."
pnpm install

log_newline

log_info "Installing Python dependencies..."
uv sync

log_newline
# Step 6: Start Docker Compose
log_info "Starting Docker Compose services..."
docker compose -f docker-compose.yml up -d

log_success "Docker Compose services started."

log_newline
# Step 7: Remind user to start ngrok manually
log_warning_bold_inline "Please start ngrok manually with: **ngrok http --url=$NGROK_DOMAIN 8000**"

log_newline
# Step 8: Apply database migrations
log_info "Applying database migrations..."
pnpm nx run py-db-models:migrations-apply:local

log_success "Database migrations applied."

log_newline
# Step 9: Bootstrap and deploy infrastructure
log_info "Bootstrapping CDK..."
pnpm nx run infra-events:cdk-bootstrap:local

log_newline

log_info "Deploying base infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-infra

log_newline

log_info "Deploying workflow infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-workflow-infra

log_success "Infrastructure deployed."

log_newline

log_rocket_bold_inline "Bootstrap complete! Use **pnpm run serve** to start the apps." 
