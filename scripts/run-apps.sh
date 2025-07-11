#!/usr/bin/env bash

set -e

CHECK="\xE2\x9C\x85"
INFO="\xE2\x84\xB9\xEF\xB8\x8F"
ROCKET="\xF0\x9F\x9A\x80"

echo -e "$INFO  Starting Apps..."
echo -e "$ROCKET Access the UI at http://localhost:3002/ui" 
echo -e "$ROCKET Access the OpenAPI Docs at http://localhost:8000/docs" 
echo -e "$ROCKET Access the Temporal Web UI at http://localhost:8080" 

NX_TUI=true pnpm nx run ui:dev-with-deps
