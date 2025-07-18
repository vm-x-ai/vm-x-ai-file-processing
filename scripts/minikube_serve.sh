#!/usr/bin/env bash

sudo -v

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

# Source .env file if it exists in the workspace root
worker_env_file="$(dirname "$0")/../packages/workflows/worker/.env.local"
set -a
if [ -f "$worker_env_file" ]; then
  . "$worker_env_file"
fi
set +a

NGROK_DOMAIN=$(echo "${INGESTION_CALLBACK_URL}" | sed -E 's#https?://([^/]+).*#\1#')

log_info_bold_inline "Starting ngrok tunnel for **${NGROK_DOMAIN}**"
ngrok http --url=http://${NGROK_DOMAIN} 80 --log=stdout --log-format=json &

if ! minikube status &>/dev/null; then
  log_warning_bold_inline "Minikube is not running, if your minikube is not bootstrapped, please run: **pnpm run minikube-bootstrap**"
  log_warning_bold_inline "If your minikube is already bootstrapped, just run **minikube start**"
  exit 1
fi

# Kill any existing minikube tunnel processes
if pgrep -f "minikube tunnel" > /dev/null; then
  log_warning "Killing existing minikube tunnel processes"
  pkill -f "minikube tunnel"
fi

log_info "Starting minikube tunnel"
minikube tunnel --cleanup &

log_info "Starting localstack port-forwarding"
kubectl port-forward svc/localstack 4566:4566 -n localstack &

wait
