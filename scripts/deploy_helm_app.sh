#!/usr/bin/env bash

set -e

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

show_help() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --app-name APP_NAME         App Name [REQUIRED]"
  echo "  --project-root PROJECT_ROOT Project Root [REQUIRED]"
  echo "  --stage STAGE               Stage (local, dev, prod) [REQUIRED]"
  echo "  --aws-region=REGION         AWS Region [REQUIRED for non-local stages]"
  echo "  --aws-profile=PROFILE       AWS Profile [OPTIONAL]"
  echo "  --ecr-repo-name             ECR Repository Name [REQUIRED]"
  echo "  --image-tag                 Image Tag [REQUIRED]"
  echo "  --service-account-name      Service Account Name [REQUIRED for local stages]"
  echo "  --help                      Show this help message and exit"
}

# Parse named arguments (support --key=value and --key value)
while [[ $# -gt 0 ]]; do
  case $1 in
    --help)
      show_help
      exit 0
      ;;
    --stage)
      STAGE="$2"; shift 2;;
    --stage=*)
      STAGE="${1#*=}"; shift;;
    --app-name)
      APP_NAME="$2"; shift 2;;
    --app-name=*)
      APP_NAME="${1#*=}"; shift;;
    --project-root)
      PROJECT_ROOT="$2"; shift 2;;
    --project-root=*)
      PROJECT_ROOT="${1#*=}"; shift;;
    --aws-region)
      AWS_REGION="$2"; shift 2;;
    --aws-region=*)
      AWS_REGION="${1#*=}"; shift;;
    --aws-profile)
      AWS_PROFILE="$2"; shift 2;;
    --aws-profile=*)
      AWS_PROFILE="${1#*=}"; shift;;
    --ecr-repo-name)
      ECR_REPO_NAME="$2"; shift 2;;
    --ecr-repo-name=*)
      ECR_REPO_NAME="${1#*=}"; shift;;
    --image-tag)
      IMAGE_TAG="$2"; shift 2;;
    --image-tag=*)
      IMAGE_TAG="${1#*=}"; shift;;
    --service-account-name)
      SERVICE_ACCOUNT_NAME="$2"; shift 2;;
    --service-account-name=*)
      SERVICE_ACCOUNT_NAME="${1#*=}"; shift;;
    *)
      echo "Unknown argument: $1"; show_help; exit 1;;
  esac
done

REQUIRED_ARGS=(
  "APP_NAME"
  "PROJECT_ROOT"
  "STAGE"
  "ECR_REPO_NAME"
  "IMAGE_TAG"
)

for arg in "${REQUIRED_ARGS[@]}"; do
  # Convert variable name to CLI arg name (e.g., APP_NAME -> app-name)
  arg_cli_name=$(echo "$arg" | tr '[:upper:]' '[:lower:]' | tr '_' '-')
  if [ -z "${!arg}" ]; then
    log_error "Error: --$arg_cli_name is required"
    show_help
    exit 1
  fi
done

# Validate stage value
if [[ ! "$STAGE" =~ ^(local|dev|prod)$ ]]; then
    log_error "Error: --stage must be one of: local, dev, prod"
    exit 1
fi

# For non-local stages, require AWS region
if [ "$STAGE" != "local" ] && [ -z "$AWS_REGION" ]; then
    log_error "Error: --aws-region is required for non-local stages"
    show_help
    exit 1
fi

if [ "$STAGE" == "local" ] && [ -z "$SERVICE_ACCOUNT_NAME" ]; then
    log_error "Error: --service-account-name is required for local stages"
    show_help
    exit 1
fi

ADDITIONAL_HELM_ARGS=""

if [ "$STAGE" == "local" ]; then
    AWS_REGION="us-east-1"
    AWS_ACCOUNT_ID="000000000000"
    SHARED_SERVICES_ACCOUNT_ID="000000000000"
    IMAGE_PULL_POLICY="IfNotPresent"
    if [ -z "$NGROK_DOMAIN" ]; then
        log_error_bold_inline "The **NGROK_DOMAIN** environment variable is required for local stages"
        show_help
        exit 1
    fi
    INGRESS_GATEWAY_ADDRESS=${NGROK_DOMAIN}
    ADDITIONAL_HELM_ARGS="--set minikube=true"
else
    if [ -z "$AWS_PROFILE" ]; then
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text --profile $AWS_PROFILE)
    else
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
    fi
    ENABLE_APP_SECRETS_STORE="false"
    IMAGE_PULL_POLICY="IfNotPresent"
    
    # TODO: This is only required when DNS is not configured
    INGRESS_GATEWAY_ADDRESS=$(kubectl get svc -n istio-system ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
fi

APP_NAMESPACE="${RESOURCE_PREFIX}-app"
SERVICE_ACCOUNT_NAME="${RESOURCE_PREFIX}-${SERVICE_ACCOUNT_NAME}"

if [ "$STAGE" == "local" ]; then

  if ! kubectl get serviceaccount $SERVICE_ACCOUNT_NAME -n ${APP_NAMESPACE} &>/dev/null; then
    log_info_bold_inline "Creating ${APP_NAME^} Service Account"
    kubectl create serviceaccount $SERVICE_ACCOUNT_NAME -n ${APP_NAMESPACE}
    log_success_bold_inline "**${APP_NAME^} Service Account** created successfully"
  fi
fi

HELM_ROOT=${PROJECT_ROOT}/argocd

if [ "$STAGE" == "local" ]; then
  HELM_VALUES_FILE=${HELM_ROOT}/dev.values.yaml
else
  HELM_VALUES_FILE=${HELM_ROOT}/${STAGE}.values.yaml
fi

ECR_REPO_PREFIX="${SHARED_SERVICES_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${RESOURCE_PREFIX}"

log_info_bold_inline "Deploying **${APP_NAME}** to **${APP_NAMESPACE}**"
log_info_bold_inline " - Stage: **${STAGE}**"
log_info_bold_inline " - Image Tag: **${IMAGE_TAG}**"

helm upgrade \
    --install ${RESOURCE_PREFIX}-${APP_NAME} ${HELM_ROOT} \
    -f ${HELM_VALUES_FILE} \
    -n ${APP_NAMESPACE} \
    --set resourcePrefix=${RESOURCE_PREFIX} \
    --set namespace=${APP_NAMESPACE} \
    --set sharedServicesAccountId=${SHARED_SERVICES_ACCOUNT_ID} \
    --set stage=${STAGE} \
    --set awsRegion=${AWS_REGION} \
    --set awsAccountId=${AWS_ACCOUNT_ID} \
    --set image.pullPolicy=${IMAGE_PULL_POLICY} \
    --set ingressGatewayAddress=${INGRESS_GATEWAY_ADDRESS} \
    --set ecrRepositoryName="${ECR_REPO_PREFIX}-${ECR_REPO_NAME}-ecr-shared" \
    --set image.tag=${IMAGE_TAG} \
    ${ADDITIONAL_HELM_ARGS} \
    --wait

log_success_bold "Deployment complete"
