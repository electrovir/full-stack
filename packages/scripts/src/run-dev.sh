#!/bin/bash

set -e

backendPort=3932; while nc -z localhost $backendPort 2>/dev/null; do ((backendPort++)); done;

echo -e "\033[90m backend port: ${backendPort}\033[0m"

backend_cmd="npm run dev --workspace @evir/backend -- --port=${backendPort}"


if [ "$#" -gt 0 ]; then
	quoted_args=$(printf '%q ' "$@")
	backend_cmd="$backend_cmd ${quoted_args% }"
fi



runstorm --max=2 --colors=green,blue --names=backend,frontend "$backend_cmd" "BACKEND_PORT=${backendPort} npm run start --workspace @evir/frontend"