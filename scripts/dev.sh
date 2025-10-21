#!/usr/bin/env bash
set -euo pipefail

echo "Starting development mode..."
./scripts/build.sh && ./scripts/start.sh
