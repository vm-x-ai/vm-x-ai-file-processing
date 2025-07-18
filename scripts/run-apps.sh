#!/usr/bin/env bash

set -e

# Source shared logging functions
source "$(dirname "$0")/shared/logging.sh"

log_info "Starting Apps..."
log_rocket_bold_inline "Access the **UI** at http://localhost:3002/ui" 
log_rocket_bold_inline "Access the **OpenAPI Docs** at http://localhost:8000/docs" 
log_rocket_bold_inline "Access the **Temporal Web UI** at http://localhost:8080" 

NX_TUI=true pnpm nx run ui:dev-with-deps
