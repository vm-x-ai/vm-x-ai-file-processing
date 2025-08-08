#!/usr/bin/env bash

# Keep sudo alive
sudo -v

# Exit immediately if a command exits with a non-zero status, treat unset variables as errors, and fail if any command in a pipeline fails
set -euo pipefail

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

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

# Check if minikube is installed
if ! command -v minikube &>/dev/null; then
  log_warning "Minikube not found. Please install it first."
  exit 1
fi

# Check if helm is installed
if ! command -v helm &>/dev/null; then
  log_warning "Helm not found. Please install it first."
  exit 1
fi

# Start minikube if it is not already running
if ! minikube status &>/dev/null; then
  if ! minikube start --cpus=8 --memory=16384 --driver=docker; then
    log_warning "Failed to start Minikube. Please check the logs and try again."
    exit 1
  fi

  log_success "Minikube started successfully"
fi

log_info "Enabling metrics-server"
if ! minikube addons enable metrics-server; then
  log_warning "Failed to enable metrics-server. Please check the logs and try again."
  exit 1
fi
log_success "metrics-server enabled successfully"

# Kill any existing minikube tunnel processes
if pgrep -f "minikube tunnel" > /dev/null; then
  log_warning "Killing existing minikube tunnel processes"
  pkill -f "minikube tunnel"
fi

log_info "Starting minikube tunnel"
MINIKUBE_TUNNEL_PID=$(minikube tunnel &>/dev/null & echo $!)
log_info "Minikube tunnel started successfully"

# Add and update Helm repositories for Istio, Temporal, and LocalStack
log_info "Updating Helm Repositories"
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo add temporal https://go.temporal.io/helm-charts
helm repo add localstack https://localstack.github.io/helm-charts
helm repo update

# Set Istio version to install
ISTIO_VERSION=1.26.1

cleanup() {
  if [[ -n "$MINIKUBE_TUNNEL_PID" ]] && ps -p "$MINIKUBE_TUNNEL_PID" > /dev/null 2>&1; then
    kill "$MINIKUBE_TUNNEL_PID"
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM

# Install Istio Base if not already installed
if ! helm status istio-base -n istio-system &>/dev/null; then
    log_info_bold "Installing Istio Base ${ISTIO_VERSION}"
    if ! helm install istio-base istio/base -n istio-system --version=${ISTIO_VERSION} --wait --create-namespace; then
        log_warning "Failed to install Istio Base. Please check the logs and try again."
        cleanup
        exit 1
    fi
    log_success "Istio Base installed successfully"
fi

# Install Istiod (Istio control plane) if not already installed
if ! helm status istiod -n istio-system &>/dev/null; then
    log_info_bold "Installing Istiod ${ISTIO_VERSION}"
    if ! helm install istiod istio/istiod -n istio-system --version=${ISTIO_VERSION} --wait; then
        log_warning "Failed to install Istiod. Please check the logs and try again."
        cleanup
        exit 1
    fi
    log_success "Istiod installed successfully"
fi

# Install Istio CNI (Container Network Interface) if not already installed
if ! helm status istio-cni -n istio-system &>/dev/null; then
    log_info_bold "Installing Istio CNI ${ISTIO_VERSION}"
    if ! helm install istio-cni istio/cni -n istio-system --version=${ISTIO_VERSION} --wait; then
        log_warning "Failed to install Istio CNI. Please check the logs and try again."
        cleanup
        exit 1
    fi
    log_success "Istio CNI installed successfully"
fi

# Install Istio Gateway (ingressgateway) if not already installed
if ! helm status ingressgateway -n istio-system &>/dev/null; then
    log_info_bold "Installing Istio Gateway ${ISTIO_VERSION}"
    if ! helm install ingressgateway istio/gateway -n istio-system --version=${ISTIO_VERSION} --wait \
        --set service.type=LoadBalancer; then
        log_warning "Failed to install Istio Gateway. Please check the logs and try again."
        cleanup
        exit 1
    fi
    log_success "Istio Gateway installed successfully"
fi

# Install Temporal via Helm if not already installed
if ! helm status temporal -n temporal &>/dev/null; then
    TEMPORAL_VERSION=0.63.0
    log_info_bold "Installing Temporal ${TEMPORAL_VERSION}, this may take a few minutes..."
    if ! helm install temporal temporal/temporal \
    --namespace temporal \
    --create-namespace \
    --version ${TEMPORAL_VERSION} \
    --wait \
    --timeout 10m \
    -f ./scripts/temporal-values.yaml; then
        log_warning "Failed to install Temporal. Please check the logs and try again."
        cleanup
        exit 1
    fi
    log_success "Temporal installed successfully"
fi

# Apply Temporal Gateway configuration
log_info "Applying Temporal Gateway"
kubectl apply -f ./packages/infra/argocd/dev/temporal-gateway.yaml
log_success "Temporal Gateway applied successfully"

# Print Temporal UI URL for user reference
log_info_bold_inline "Temporal UI URL: http://localhost:80/temporal Make sure you have the **minikube tunnel** running"

# Install LocalStack via Helm if not already installed
log_info "Installing LocalStack, this may take a few minutes..."
if ! helm status localstack -n localstack &>/dev/null; then
    log_info "Creating LocalStack namespace"
    kubectl create namespace localstack --dry-run=client -o yaml | kubectl apply -f -
    log_info "Installing LocalStack"
    if ! helm install localstack localstack/localstack --namespace localstack --wait \
        -f ./scripts/localstack-values.yaml; then
        log_warning "Failed to install LocalStack. Please check the logs and try again."
        cleanup
        exit 1
    fi
    log_success "LocalStack installed successfully"
fi

# Print instructions for accessing LocalStack
log_info_bold_inline "To access LocalStack, run: **kubectl port-forward svc/localstack 4566:4566 -n localstack**"

# Set resource prefix and app namespace variables
RESOURCE_PREFIX="${RESOURCE_PREFIX:-file-processing}"
APP_NAMESPACE="${RESOURCE_PREFIX}-app"

# Create the application namespace if it doesn't exist
log_info "Creating ${APP_NAMESPACE} namespace"
kubectl create namespace ${APP_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
log_success "${APP_NAMESPACE} namespace created successfully"

# Deploy PostgreSQL for the app namespace
log_info "Creating ${APP_NAMESPACE} PostgreSQL"
kubectl apply -f ./scripts/app-postgresql.yaml -n ${APP_NAMESPACE}
log_success "${APP_NAMESPACE} PostgreSQL created successfully"

# Kill any process using port 5434 to avoid port-forwarding conflicts
if lsof -i :5434 &>/dev/null; then
  log_warning "Port 5434 is already in use, killing process..."
  sudo lsof -i :5434 | awk 'NR>1 {print $2}' | xargs kill -9
fi

log_info "Waiting for PostgreSQL to be ready"
kubectl wait --for=condition=ready pod -l app=app-postgresql -n ${APP_NAMESPACE} --timeout=300s
log_success "PostgreSQL is ready"

# Port-forward PostgreSQL service to localhost:5434
log_info "Forwarding PostgreSQL to localhost:5434"
PORT_FORWARD_PID=$(kubectl port-forward svc/app-postgresql 5434:5432 -n ${APP_NAMESPACE} &>/dev/null & echo $!)
log_success "PostgreSQL port forwarded to localhost:5434"


# Apply database migrations using pnpm and Nx
log_info "Applying Database Migrations"
pnpm nx run py-db-models:migrations-apply:minikube
log_success "Database Migrations applied successfully"

# Stop port-forwarding for PostgreSQL
log_info "Stopping PostgreSQL port forwarding"
kill $PORT_FORWARD_PID
log_success "PostgreSQL port forwarding stopped"

# Create OpenAI credentials secret if it doesn't exist
if ! kubectl get secret openai-credentials -n ${APP_NAMESPACE} &>/dev/null; then
  log_info "Creating OpenAI Credentials Secret"
  kubectl create secret generic openai-credentials \
    --from-literal=api_key=${worker_env_vars[OPENAI_API_KEY]} \
    -n ${APP_NAMESPACE}
fi

# Create database secret if it doesn't exist
if ! kubectl get secret ${RESOURCE_PREFIX}-app-database-secret -n ${APP_NAMESPACE} &>/dev/null; then
  log_info "Creating Database Secrets"
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
  log_info "Creating Database RO Host Secret"
  kubectl create secret generic ${RESOURCE_PREFIX}-app-database-ro-host \
    --from-literal=${RESOURCE_PREFIX}-app-database-ro-host=app-postgresql.${APP_NAMESPACE}.svc.cluster.local \
    -n ${APP_NAMESPACE}
fi

# Create VMX credentials secret if it doesn't exist
if ! kubectl get secret vmx-credentials -n ${APP_NAMESPACE} &>/dev/null; then
  log_info "Creating VMX Credentials Secret"
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
export API_URL=http://localhost:80/api

# Configure Docker to use Minikube's Docker daemon
eval $(minikube docker-env --shell=bash)

TAG="$(date +%s)"

# Build Docker images for all relevant projects using Nx and pnpm
log_info "Building Docker Images, this may take a few minutes..."
NX_TUI=true pnpm nx run-many -t docker-build -c dev --tag "${TAG}" --exclude 'tag:no-docker-build:dev'
log_success "Docker Images built successfully"

log_newline
log_info "Deploying Base Infrastructure"
# Kill any process using port 4566 to avoid port-forwarding conflicts for LocalStack
if lsof -i :4566 &>/dev/null; then
  log_warning "Port 4566 is already in use, killing process..."
  sudo lsof -i :4566 | awk 'NR>1 {print $2}' | xargs kill -9
fi

# Port-forward LocalStack service to localhost:4566
PORT_FORWARD_PID=$(kubectl port-forward svc/localstack 4566:4566 -n localstack &>/dev/null & echo $!)
log_success "LocalStack port forwarded to localhost:4566"

log_newline
log_info "Bootstrapping CDK..."
pnpm nx run infra-events:cdk-bootstrap:local

log_newline

log_info "Deploying base infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-infra

log_newline

log_info "Deploying workflow infrastructure..."
NX_TUI=true pnpm nx run-many -t cdk-deploy -c local --projects=tag:local-workflow-infra

log_success "Infrastructure deployed."

log_info "Stopping LocalStack port forwarding"
kill $PORT_FORWARD_PID
log_success "LocalStack port forwarding stopped"

# Set ECR repository prefix for Docker images
ECR_REPO_PREFIX="${SHARED_SERVICES_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/${RESOURCE_PREFIX}"

log_newline
log_info "Deploying apps..."
NX_TUI=true pnpm nx run-many -t helm-deploy -c local --tag "${TAG}"

LOCALSTACK_HOST="localstack.localstack.svc.cluster.local"

if ! grep -q "${LOCALSTACK_HOST}" /etc/hosts; then
  log_newline
  log_info "Adding ${LOCALSTACK_HOST} to /etc/hosts"
  echo "127.0.0.1 ${LOCALSTACK_HOST}" | sudo tee -a /etc/hosts
  log_success "${LOCALSTACK_HOST} added to /etc/hosts"
fi

if [[ "$(uname -r)" == *"microsoft-standard-WSL"* ]]; then
  if ! grep -q "${LOCALSTACK_HOST}" /mnt/c/Windows/System32/drivers/etc/hosts; then
    log_newline
    log_info "You are running on Windows WSL, adding ${LOCALSTACK_HOST} to Windows Hosts file"
    log_info "The consent prompt will appear in a few seconds, please grant the permission to continue"
    sleep 5
    powershell.exe -Command "Start-Process powershell -Verb runAs -ArgumentList \"Add-Content -Path C:\\Windows\\System32\\drivers\\etc\\hosts -Value '127.0.0.1 localstack.localstack.svc.cluster.local'\""
    log_success "${LOCALSTACK_HOST} added to Windows Hosts file"
  fi
fi

log_newline
log_rocket_bold_inline "The stack is now running on **Minikube**"
log_rocket_bold_inline "Make sure you have the **minikube tunnel** running, **ngrok** running and **localstack port-forwarding** running"
log_rocket "  - pnpm run minikube-serve"
log_rocket_bold_inline "You can access the **Temporal UI** at: http://localhost/temporal"
log_rocket_bold_inline "You can access the **API OpenAI Docs** at: http://localhost/api/docs"
log_rocket_bold_inline "You can access the **UI** at: http://localhost/ui"

cleanup
