#!/usr/bin/env bash

set -e

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"
source "$(dirname "$0")/shared/run-docker.sh"

run_docker_services
