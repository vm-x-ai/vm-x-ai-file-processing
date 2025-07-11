#!/usr/bin/env bash

# Usage: ./db_tunnel.sh [--aws-profile <profile>] [--stage <stage>] [--local-port <port>]
# This script sets up a port forwarding tunnel to the Aurora database using AWS SSM.
# It uses RESOURCE_PREFIX from the environment, .env file, or defaults to 'file-processing'.

set -euo pipefail

# Source .env file if it exists in the workspace root
env_file="$(dirname "$0")/../.env"
if [ -f "$env_file" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$env_file"
  set +a
fi

RESOURCE_PREFIX="${RESOURCE_PREFIX:-file-processing}"
AWS_PROFILE="${AWS_PROFILE:-}"
STAGE="dev"
LOCAL_PORT=5434

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --aws-profile|-p)
      AWS_PROFILE="$2"
      shift 2
      ;;
    --stage)
      STAGE="$2"
      shift 2
      ;;
    --local-port|-l)
      LOCAL_PORT="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--aws-profile <profile>] [--stage <stage>] [--local-port <port>]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      echo "Usage: $0 [--aws-profile <profile>] [--stage <stage>] [--local-port <port>]"
      exit 1
      ;;
  esac
done

if [ -z "$AWS_PROFILE" ]; then
  echo "AWS profile must be specified with --aws-profile or AWS_PROFILE env var."
  exit 1
fi

export AWS_PROFILE

# Get Bastion Host Instance ID
BASTION_INSTANCE_ID=$(aws ssm get-parameter \
  --name "/${RESOURCE_PREFIX}-app/${STAGE}/bastion-host/instance-id" \
  --query 'Parameter.Value' --output text)

# Get Database Endpoint and Port
DB_HOST=$(aws ssm get-parameter \
  --name "/${RESOURCE_PREFIX}-app/${STAGE}/database/endpoint" \
  --query 'Parameter.Value' --output text)
DB_PORT=$(aws ssm get-parameter \
  --name "/${RESOURCE_PREFIX}-app/${STAGE}/database/port" \
  --query 'Parameter.Value' --output text)

echo "Starting port forwarding session to $DB_HOST:$DB_PORT on local port $LOCAL_PORT"

# Start SSM Port Forwarding Session
aws ssm start-session \
  --target "$BASTION_INSTANCE_ID" \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "host=$DB_HOST,portNumber=$DB_PORT,localPortNumber=$LOCAL_PORT"
