#!/usr/bin/env bash

# Keep sudo alive
sudo -v

# Exit immediately if a command exits with a non-zero status, treat unset variables as errors, and fail if any command in a pipeline fails
set -euo pipefail

# Source .env file if it exists in the workspace root
root_env_file="$(dirname "$0")/../.env"
set -a
if [ -f "$root_env_file" ]; then
  . "$root_env_file"
fi
set +a

# Declare an associative array to hold worker environment variables
declare -A worker_env_vars

# Extract database and other credentials from the worker's .env.local file
WORKER_ENV_FILE="$(dirname "$0")/../packages/workflows/worker/.env.local"
if [ -f "$WORKER_ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    # Skip empty lines and lines starting with #
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
    # Remove possible surrounding quotes from value
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    worker_env_vars["$key"]="$value"
  done < "$WORKER_ENV_FILE"
fi

# Define emoji variables for use in output messages
CHECK="\xE2\x9C\x85"
CROSS="\xE2\x9D\x8C"
INFO="\xE2\x84\xB9\xEF\xB8\x8F"
WARN="\xF0\x9F\x9A\xA8"
ROCKET="\xF0\x9F\x9A\x80"
GEAR="\xE2\x9A\x99\xEF\xB8\x8F"

# Define color and style helpers for output formatting
BOLD="\033[1m"
RESET="\033[0m"
BLUE="\033[34m"
YELLOW="\033[33m"

# Check if minikube is installed
if ! command -v minikube &>/dev/null; then
  echo -e "$WARN Minikube not found. Please install it first."
  exit 1
fi

# Check if helm is installed
if ! command -v helm &>/dev/null; then
  echo -e "$WARN Helm not found. Please install it first."
  exit 1
fi

# Start minikube if it is not already running
if ! minikube status &>/dev/null; then
  if ! minikube start --cpus=8 --memory=16384 --driver=docker; then
    echo -e "$WARN Failed to start Minikube. Please check the logs and try again."
    exit 1
  fi

  echo -e "$CHECK Minikube started successfully"
fi

# Kill any existing minikube tunnel processes
if pgrep -f "minikube tunnel" > /dev/null; then
  echo -e "$WARN  Killing existing minikube tunnel processes"
  pkill -f "minikube tunnel"
fi

echo -e "$INFO  Starting minikube tunnel"
MINIKUBE_TUNNEL_PID=$(minikube tunnel &>/dev/null & echo $!)
echo -e "$INFO  Minikube tunnel started successfully"

# Add and update Helm repositories for Istio, Temporal, and LocalStack
echo -e "$INFO  Updating Helm Repositories"
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo add temporal https://go.temporal.io/helm-charts
helm repo add localstack https://localstack.github.io/helm-charts
helm repo update

# Set Istio version to install
ISTIO_VERSION=1.26.1

cleanup() {
  [[ -n "$MINIKUBE_TUNNEL_PID" ]] && kill "$MINIKUBE_TUNNEL_PID"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Install Istio Base if not already installed
if ! helm status istio-base -n istio-system &>/dev/null; then
    echo -e "$INFO  Installing Istio Base ${BOLD}${ISTIO_VERSION}${RESET}"
    if ! helm install istio-base istio/base -n istio-system --version=${ISTIO_VERSION} --wait --create-namespace; then
        echo -e "$WARN Failed to install Istio Base. Please check the logs and try again."
        cleanup
        exit 1
    fi
    echo -e "$CHECK Istio Base installed successfully"
fi

# Install Istiod (Istio control plane) if not already installed
if ! helm status istiod -n istio-system &>/dev/null; then
    echo -e "$INFO  Installing Istiod ${BOLD}${ISTIO_VERSION}${RESET}"
    if ! helm install istiod istio/istiod -n istio-system --version=${ISTIO_VERSION} --wait; then
        echo -e "$WARN Failed to install Istiod. Please check the logs and try again."
        cleanup
        exit 1
    fi
    echo -e "$CHECK Istiod installed successfully"
fi

# Install Istio CNI (Container Network Interface) if not already installed
if ! helm status istio-cni -n istio-system &>/dev/null; then
    echo -e "$INFO  Installing Istio CNI ${BOLD}${ISTIO_VERSION}${RESET}"
    if ! helm install istio-cni istio/cni -n istio-system --version=${ISTIO_VERSION} --wait; then
        echo -e "$WARN Failed to install Istio CNI. Please check the logs and try again."
        cleanup
        exit 1
    fi
    echo -e "$CHECK Istio CNI installed successfully"
fi

# Install Istio Gateway (ingressgateway) if not already installed
if ! helm status ingressgateway -n istio-system &>/dev/null; then
    echo -e "$INFO  Installing Istio Gateway ${BOLD}${ISTIO_VERSION}${RESET}"
    if ! helm install ingressgateway istio/gateway -n istio-system --version=${ISTIO_VERSION} --wait \
        --set service.type=LoadBalancer; then
        echo -e "$WARN Failed to install Istio Gateway. Please check the logs and try again."
        cleanup
        exit 1
    fi
    echo -e "$CHECK Istio Gateway installed successfully"
fi

# Install Temporal via Helm if not already installed
if ! helm status temporal -n temporal &>/dev/null; then
    TEMPORAL_VERSION=0.63.0
    echo -e "$INFO  Installing Temporal ${BOLD}${TEMPORAL_VERSION}${RESET}, this may take a few minutes..."
    if ! helm install temporal temporal/temporal \
    --namespace temporal \
    --create-namespace \
    --version ${TEMPORAL_VERSION} \
    --wait \
    --timeout 10m \
    -f ./scripts/temporal-values.yaml; then
        echo -e "$WARN Failed to install Temporal. Please check the logs and try again."
        cleanup
        exit 1
    fi
    echo -e "$CHECK Temporal installed successfully"
fi

# Apply Temporal Gateway configuration
echo -e "$INFO  Applying Temporal Gateway"
kubectl apply -f ./packages/infra/argocd/dev/temporal-gateway.yaml
echo -e "$CHECK Temporal Gateway applied successfully"

# Print Temporal UI URL for user reference
echo -e "$INFO  Temporal UI URL: http://localhost:80/temporal ${BOLD}Make sure you have the minikube tunnel running${RESET}"

# Install LocalStack via Helm if not already installed
echo -e "$INFO  Installing LocalStack, this may take a few minutes..."
if ! helm status localstack -n localstack &>/dev/null; then
    echo -e "$INFO  Creating LocalStack namespace"
    kubectl create namespace localstack --dry-run=client -o yaml | kubectl apply -f -
    echo -e "$INFO  Installing LocalStack"
    if ! helm install localstack localstack/localstack --namespace localstack --wait \
        -f ./scripts/localstack-values.yaml; then
        echo -e "$WARN Failed to install LocalStack. Please check the logs and try again."
        cleanup
        exit 1
    fi
    echo -e "$CHECK LocalStack installed successfully"
fi

# Print instructions for accessing LocalStack
echo -e "$INFO  To access LocalStack, run: kubectl port-forward svc/localstack 4566:4566 -n localstack"

# Set resource prefix and app namespace variables
RESOURCE_PREFIX="${RESOURCE_PREFIX:-file-processing}"
APP_NAMESPACE="${RESOURCE_PREFIX}-app"

# Create the application namespace if it doesn't exist
echo -e "$INFO  Creating ${APP_NAMESPACE} namespace"
kubectl create namespace ${APP_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
echo -e "$CHECK ${APP_NAMESPACE} namespace created successfully"

# Deploy PostgreSQL for the app namespace
echo -e "$INFO  Creating ${APP_NAMESPACE} PostgreSQL"
kubectl apply -f ./scripts/app-postgresql.yaml -n ${APP_NAMESPACE}
echo -e "$CHECK ${APP_NAMESPACE} PostgreSQL created successfully"

# Kill any process using port 5434 to avoid port-forwarding conflicts
if lsof -i :5434 &>/dev/null; then
  echo -e "$WARN Port 5434 is already in use, killing process..."
  sudo lsof -i :5434 | awk 'NR>1 {print $2}' | xargs kill -9
fi

echo -e "$INFO  Waiting for PostgreSQL to be ready"
kubectl wait --for=condition=ready pod -l app=app-postgresql -n ${APP_NAMESPACE} --timeout=300s
echo -e "$CHECK PostgreSQL is ready"

# Port-forward PostgreSQL service to localhost:5434
echo -e "$INFO  Forwarding PostgreSQL to localhost:5434"
PORT_FORWARD_PID=$(kubectl port-forward svc/app-postgresql 5434:5432 -n ${APP_NAMESPACE} &>/dev/null & echo $!)
echo -e "$CHECK PostgreSQL port forwarded to localhost:5434"


# Apply database migrations using pnpm and Nx
echo -e "$INFO  Applying Database Migrations"
pnpm nx run py-db-models:migrations-apply:minikube
echo -e "$CHECK Database Migrations applied successfully"

# Stop port-forwarding for PostgreSQL
echo -e "$INFO  Stopping PostgreSQL port forwarding"
kill $PORT_FORWARD_PID
echo -e "$CHECK PostgreSQL port forwarding stopped"

# Create OpenAI credentials secret if it doesn't exist
if ! kubectl get secret openai-credentials -n ${APP_NAMESPACE} &>/dev/null; then
  echo -e "$INFO  Creating OpenAI Credentials Secret"
  kubectl create secret generic openai-credentials \
    --from-literal=api_key=${worker_env_vars[OPENAI_API_KEY]} \
    -n ${APP_NAMESPACE}
fi

# Create database secret if it doesn't exist
if ! kubectl get secret ${RESOURCE_PREFIX}-app-database-secret -n ${APP_NAMESPACE} &>/dev/null; then
  echo -e "$INFO  Creating Database Secrets"
  kubectl create secret generic ${RESOURCE_PREFIX}-app-database-secret \
    --from-literal=host=app-postgresql.${APP_NAMESPACE}.svc.cluster.local \
    --from-literal=port=5432 \
    --from-literal=username=app \
    --from-literal=password=app \
    --from-literal=dbname=ingestion \
    -n ${APP_NAMESPACE}
fi

# Create database read-only host secret if it doesn't exist
if ! kubectl get secret ${RESOURCE_PREFIX}-app-database-ro-host -n ${APP_NAMESPACE} &>/dev/null; then
  echo -e "$INFO  Creating Database RO Host Secret"
  kubectl create secret generic ${RESOURCE_PREFIX}-app-database-ro-host \
    --from-literal=${RESOURCE_PREFIX}-app-database-ro-host=app-postgresql.${APP_NAMESPACE}.svc.cluster.local \
    -n ${APP_NAMESPACE}
fi

# Create VMX credentials secret if it doesn't exist
if ! kubectl get secret vmx-credentials -n ${APP_NAMESPACE} &>/dev/null; then
  echo -e "$INFO  Creating VMX Credentials Secret"
  kubectl create secret generic vmx-credentials \
    --from-literal=domain=${worker_env_vars[VMX_DOMAIN]} \
    --from-literal=api_key=${worker_env_vars[VMX_API_KEY]} \
    --from-literal=workspace_id=${worker_env_vars[VMX_WORKSPACE_ID]} \
    --from-literal=environment_id=${worker_env_vars[VMX_ENVIRONMENT_ID]} \
    --from-literal=resource_id=${worker_env_vars[VMX_RESOURCE_ID]} \
    -n ${APP_NAMESPACE}
fi

# Export shared services and API environment variables for use in builds and deployments
export SHARED_SERVICES_ACCOUNT_ID=000000000000
export NEXT_PUBLIC_API_URL=http://localhost:80/api

# Configure Docker to use Minikube's Docker daemon
eval $(minikube docker-env --shell=bash)

TAG="$(date +%s)"

# Build Docker images for all relevant projects using Nx and pnpm
echo -e "$INFO  Building Docker Images, this may take a few minutes..."
NX_TUI=true pnpm nx run-many -t docker-build -c dev --tag "${TAG}" --exclude 'tag:no-docker-build:dev'
echo -e "$CHECK Docker Images built successfully"

echo 
echo -e "$INFO  Deploying Base Infrastructure"
# Kill any process using port 4566 to avoid port-forwarding conflicts for LocalStack
if lsof -i :4566 &>/dev/null; then
  echo -e "$WARN Port 4566 is already in use, killing process..."
  sudo lsof -i :4566 | awk 'NR>1 {print $2}' | xargs kill -9
fi

# Port-forward LocalStack service to localhost:4566
PORT_FORWARD_PID=$(kubectl port-forward svc/localstack 4566:4566 -n localstack &>/dev/null & echo $!)
echo -e "$CHECK LocalStack port forwarded to localhost:4566"

echo
echo -e "$INFO  Bootstrapping CDK..."
pnpm nx run infra-events:cdk-bootstrap:local

echo

echo -e "$INFO  Deploying base infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-infra

echo

echo -e "$INFO  Deploying workflow infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-workflow-infra

echo -e "$CHECK Infrastructure deployed."

echo -e "$INFO  Stopping LocalStack port forwarding"
kill $PORT_FORWARD_PID
echo -e "$CHECK LocalStack port forwarding stopped"

# Set ECR repository prefix for Docker images
ECR_REPO_PREFIX="${SHARED_SERVICES_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${RESOURCE_PREFIX}"

echo
echo -e "$INFO  Deploying apps..."

# Set reusable API deployment variables
API_SHARED_SERVICES_ACCOUNT_ID="${SHARED_SERVICES_ACCOUNT_ID}"
API_STAGE="local"
API_AWS_REGION="us-east-1"
API_AWS_ACCOUNT_ID="000000000000"
API_ENABLE_APP_SECRETS_STORE="false"
API_IMAGE_PULL_POLICY="IfNotPresent"

# Extract ngrok domain from ingestion callback URL for ingress gateway
NGROK_DOMAIN=$(echo "${worker_env_vars[INGESTION_CALLBACK_URL]}" | sed -E 's#https?://([^/]+).*#\1#')

# Common --set arguments for Helm deployments (reusable)
API_HELM_SET_ARGS="\
  --set resourcePrefix=${RESOURCE_PREFIX} \
  --set namespace=${APP_NAMESPACE} \
  --set sharedServicesAccountId=${API_SHARED_SERVICES_ACCOUNT_ID} \
  --set stage=${API_STAGE} \
  --set awsRegion=${API_AWS_REGION} \
  --set awsAccountId=${API_AWS_ACCOUNT_ID} \
  --set enableAppSecretsStore=${API_ENABLE_APP_SECRETS_STORE} \
  --set image.pullPolicy=${API_IMAGE_PULL_POLICY} \
  --set ingressGatewayAddress=${NGROK_DOMAIN} \
  --set minikube=true"

# Function to create service account and deploy app via Helm
function deploy_app() {
  local app_name="$1"
  local service_account_name="${RESOURCE_PREFIX}-$2"
  local package_path="$3"
  local ecr_name="$4"
  local image_tag="$5"

  # Create service account if it doesn't exist
  if ! kubectl get serviceaccount $service_account_name -n ${APP_NAMESPACE} &>/dev/null; then
    echo -e "$INFO  Creating ${app_name^} Service Account"
    kubectl create serviceaccount $service_account_name -n ${APP_NAMESPACE}
    echo -e "$CHECK ${app_name^} Service Account created successfully"
  fi

  # Deploy the app using Helm upgrade/install
  echo -e "$INFO  Deploying ${app_name^}"
  helm upgrade --install ${RESOURCE_PREFIX}-${app_name} $package_path \
    -f $package_path/dev.values.yaml \
    $API_HELM_SET_ARGS \
    --set ecrRepositoryName=${ecr_name} \
    --set image.tag=${image_tag} \
    -n ${APP_NAMESPACE} \
    --wait
  echo -e "$CHECK ${app_name^} deployed successfully"
}

# Define app configurations: name, service account, package path, and ECR name
apps=(
  "api api-service-account ./packages/apps/api/argocd ${ECR_REPO_PREFIX}-api-ecr-shared ${TAG}"
  "ingestion-workflow-sqs-consumer ingestion-workflow-service-account ./packages/workflows/ingestion/argocd ${ECR_REPO_PREFIX}-ingestion-workflow-sqs-consumer-ecr-shared ${TAG}"
  "evaluation-workflow-sqs-consumer evaluation-workflow-service-account ./packages/workflows/evaluation/argocd ${ECR_REPO_PREFIX}-evaluation-workflow-sqs-consumer-ecr-shared ${TAG}"
  "temporal-worker temporal-worker-service-account ./packages/workflows/worker/argocd ${ECR_REPO_PREFIX}-temporal-worker-ecr-shared ${TAG}"
  "ui ui-service-account ./packages/apps/ui/argocd ${ECR_REPO_PREFIX}-ui-ecr-shared dev-${TAG}"
)

# Loop through each app configuration and deploy using the deploy_app function
for app in "${apps[@]}"; do
  deploy_app $app
  echo

done

LOCALSTACK_HOST="localstack.localstack.svc.cluster.local"

if ! grep -q "${LOCALSTACK_HOST}" /etc/hosts; then
  echo
  echo -e "$INFO  Adding ${LOCALSTACK_HOST} to /etc/hosts"
  echo "127.0.0.1 ${LOCALSTACK_HOST}" | sudo tee -a /etc/hosts
  echo -e "$CHECK ${LOCALSTACK_HOST} added to /etc/hosts"
fi

if [[ "$(uname -r)" == *"microsoft-standard-WSL"* ]]; then
  if ! grep -q "${LOCALSTACK_HOST}" /mnt/c/Windows/System32/drivers/etc/hosts; then
    echo
    echo -e "$INFO  You are running on Windows WSL, adding ${LOCALSTACK_HOST} to Windows Hosts file"
    echo -e "$INFO  The consent prompt will appear in a few seconds, please grant the permission to continue"
    sleep 5
    powershell.exe -Command "Start-Process powershell -Verb runAs -ArgumentList \"Add-Content -Path C:\\Windows\\System32\\drivers\\etc\\hosts -Value '127.0.0.1 localstack.localstack.svc.cluster.local'\""
    echo -e "$CHECK ${LOCALSTACK_HOST} added to Windows Hosts file"
  fi
fi

echo
echo -e "$ROCKET The stack is now running on Minikube"
echo -e "$ROCKET Make sure you have the minikube tunnel running, ngrok running and localstack port-forwarding running"
echo -e "$ROCKET   - ${BOLD}pnpm run minikube-serve${RESET}"
echo -e "$ROCKET You can access the Temporal UI at: ${BOLD}http://localhost/temporal${RESET}"
echo -e "$ROCKET You can access the API OpenAI Docs at: ${BOLD}http://localhost/api/docs${RESET}"
echo -e "$ROCKET You can access the UI at: ${BOLD}http://localhost/ui${RESET}"

cleanup
