#!/usr/bin/env bash

sudo -v

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

# Source .env file if it exists in the workspace root
worker_env_file="$(dirname "$0")/../packages/workflows/worker/.env.local"
set -a
if [ -f "$worker_env_file" ]; then
  . "$worker_env_file"
fi
set +a

NGROK_DOMAIN=$(echo "${INGESTION_CALLBACK_URL}" | sed -E 's#https?://([^/]+).*#\1#')

echo -e "$INFO  Starting ngrok tunnel for ${BOLD}${NGROK_DOMAIN}${RESET}"
ngrok http --url=http://${NGROK_DOMAIN} 80 --log=stdout --log-format=json &

if ! minikube status &>/dev/null; then
  echo -e "$WARN  Minikube is not running, if your minikube is not bootstrapped, please run: ${BOLD}pnpm run minikube-bootstrap${RESET}"
  echo -e "$WARN  If your minikube is already bootstrapped, just run ${BOLD}minikube start${RESET}"
  exit 1
fi

# Kill any existing minikube tunnel processes
if pgrep -f "minikube tunnel" > /dev/null; then
  echo -e "$WARN  Killing existing minikube tunnel processes"
  pkill -f "minikube tunnel"
fi

echo -e "$INFO  Starting minikube tunnel"
minikube tunnel --cleanup &

echo -e "$INFO  Starting localstack port-forwarding"
kubectl port-forward svc/localstack 4566:4566 -n localstack &

wait
