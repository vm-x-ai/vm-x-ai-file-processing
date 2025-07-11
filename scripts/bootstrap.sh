#!/usr/bin/env bash

set -e

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

# Emojis
CHECK="\xE2\x9C\x85"
CROSS="\xE2\x9D\x8C"
INFO="\xE2\x84\xB9\xEF\xB8\x8F"
WARN="\xF0\x9F\x9A\xA8"
ROCKET="\xF0\x9F\x9A\x80"
GEAR="\xE2\x9A\x99\xEF\xB8\x8F"

# Color and style helpers
BOLD="\033[1m"
RESET="\033[0m"
BLUE="\033[34m"
YELLOW="\033[33m"

# Step 1: Check for required binaries
REQUIRED_BINS=(node pnpm docker ngrok uv)
MISSING=()
echo -e "$INFO  Checking required binaries..."
for bin in "${REQUIRED_BINS[@]}"; do
  if ! command -v $bin &>/dev/null; then
    echo -e "$CROSS $bin not found."
    MISSING+=("$bin")
  fi
done
if [ ${#MISSING[@]} -ne 0 ]; then
  echo -e "$WARN Please install the missing binaries: ${MISSING[*]}"
  exit 1
else
  echo -e "$CHECK All required binaries found."
fi

echo
# Step 2: Check if Docker is running
echo -e "$INFO  Checking if Docker is running..."
if ! docker info &>/dev/null; then
  echo -e "$CROSS Docker is not running. Please start Docker."
  exit 1
else
  echo -e "$CHECK Docker is running."
fi

echo
# Step 3: Prompt for secrets and config
echo -e "${INFO}  ${BOLD}OpenAI API Key Setup:${RESET}"
echo -e "1. Go to ${BOLD}${BLUE}https://platform.openai.com/account/api-keys${RESET}"
echo -e "2. Click ${BOLD}Create new secret key${RESET} and copy your key."
echo -e "3. Save it somewhere safe—you'll need it for the next step."
echo
if [ -z "$OPENAI_API_KEY" ]; then
  read -p "Enter your OpenAI API key: " OPENAI_API_KEY
fi

echo

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
  echo
  echo -e "${INFO}  VM-X Account & Workspace Setup:"
  echo -e "1. Go to ${BOLD}${BLUE}https://vm-x.ai/plans${RESET} and select the Beta plan (free)."
  echo -e "2. Sign up with your email or Google account."
  echo -e "3. After signup, you'll be redirected to ${BOLD}${BLUE}https://console.vm-x.ai/getting-started${RESET}."
  echo -e "4. Create a workspace (e.g., my-dev-workspace) and environment (e.g., local or dev)."
  echo -e "5. Wait for your ${BOLD}API Key${RESET} to be generated. Copy and save it."
  echo -e "6. You'll be redirected to the LLM provider integration page. Paste your OpenAI API Key and click Save."
  echo -e "7. A dialog will show your ${BOLD}Workspace ID${RESET} and ${BOLD}Environment ID${RESET}. Copy and save both."
  echo

  echo -e "You will need the following for the next steps:"
  echo -e "- ${BOLD}VMX API Key${RESET} (from step 5)"
  echo -e "- ${BOLD}VMX Workspace ID${RESET} (from step 7)"
  echo -e "- ${BOLD}VMX Environment ID${RESET} (from step 7)"
  echo -e "- ${BOLD}VMX Domain${RESET} (default: ${BOLD}us-east-1.vm-x.ai${RESET})"
  echo -e "- ${BOLD}VMX Resource ID${RESET} (default: ${BOLD}openai-default${RESET})"
  echo
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
  read -p "Enter your VMX Domain [${BOLD}us-east-1.vm-x.ai${RESET}]: " VMX_DOMAIN
fi
VMX_DOMAIN=${VMX_DOMAIN:-us-east-1.vm-x.ai}
if [ -z "$VMX_RESOURCE_ID" ]; then
  read -p "Enter your VMX Resource ID [${BOLD}openai-default${RESET}]: " VMX_RESOURCE_ID
fi
VMX_RESOURCE_ID=${VMX_RESOURCE_ID:-openai-default}

echo

if [ $ALL_VMX_NGROK_SET -eq 0 ]; then
  echo -e "${INFO}  Ngrok Custom Domain Setup:"
  echo -e "- See the official guide: ${BOLD}${BLUE}https://ngrok.com/docs/universal-gateway/custom-domains/${RESET}"
  echo -e "- This allows you to use your own domain (e.g., app.your-domain.com) with ngrok for a persistent, memorable endpoint."
  echo -e "- Steps:"
  echo -e "   1. In your ngrok dashboard, go to the Domains page and click ${BOLD}New Domain${RESET} to add your domain."
  echo -e "   2. ngrok will provide a ${BOLD}CNAME${RESET} value (e.g., exampledata.otherdata.ngrok-cname.com). Copy this."
  echo -e "   3. In your DNS provider's dashboard, create a ${BOLD}CNAME${RESET} record for your domain (e.g., app.your-domain.com) pointing to the value from step 2."
  echo -e "   5. Start your tunnel with: ${BOLD}ngrok http --url=<YOUR_CUSTOM_DOMAIN> 8000${RESET}"
  echo -e "   6. Enter your custom domain (e.g., app.your-domain.com) below."
  echo
fi
if [ -z "$NGROK_DOMAIN" ]; then
  read -p "Enter your ngrok custom domain (e.g. app.your-domain.com): " NGROK_DOMAIN
fi
NGROK_URL="https://$NGROK_DOMAIN"

echo
# Step 4: Generate .env files
echo -e "$INFO  Generating .env files..."

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
# <RESOURCE_PREFIX>-file-thumbnail-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
THUMBNAIL_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-file-thumbnail-us-east-1-local"
# <RESOURCE_PREFIX>-ingestion-landing-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
LANDING_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-ingestion-landing-us-east-1-local"

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
# <RESOURCE_PREFIX>-ingestion-landing-<REGION>-<STAGE>
# The Pydantic settings will resolve the Jinja templates
LANDING_S3_BUCKET_NAME="{{ RESOURCE_PREFIX }}-ingestion-landing-us-east-1-local"

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

echo -e "$CHECK .env files generated."

echo
# Step 5: Install dependencies
echo -e "$INFO  Installing Node.js dependencies..."
pnpm install

echo

echo -e "$INFO  Installing Python dependencies..."
uv sync

echo
# Step 6: Start Docker Compose
echo -e "$INFO  Starting Docker Compose services..."
docker compose -f docker-compose.yml up -d

echo -e "$CHECK Docker Compose services started."

echo
# Step 7: Remind user to start ngrok manually
echo -e "$WARN Please start ngrok manually with: ngrok http --url=$NGROK_DOMAIN 8000"

echo
# Step 8: Apply database migrations
echo -e "$INFO  Applying database migrations..."
pnpm nx run py-db-models:migrations-apply:local

echo -e "$CHECK Database migrations applied."

echo
# Step 9: Bootstrap and deploy infrastructure
echo -e "$INFO  Bootstrapping CDK..."
pnpm nx run infra-events:cdk-bootstrap:local

echo

echo -e "$INFO  Deploying base infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-infra

echo

echo -e "$INFO  Deploying workflow infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-workflow-infra

echo -e "$CHECK Infrastructure deployed."

echo

echo -e "$ROCKET Bootstrap complete! Use ./scripts/run-apps.sh to start the apps." 
