#!/usr/bin/env bash

set -e

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

function run_docker_services() {
    # Check if any of the main containers are already running
    if docker compose -f docker-compose.yml ps --status running --quiet | grep -q .; then
        log_info "Docker Compose services are already running."
        log_success "Skipping Docker Compose startup."
    else
        log_info "Starting Docker Compose services..."
        docker compose -f docker-compose.yml up -d
        log_success "Docker Compose services started."

        log_newline
        log_info "Applying database migrations..."
        pnpm nx run py-db-models:migrations-apply:local

        log_success "Database migrations applied."

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
    fi
}
