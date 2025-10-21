#!/usr/bin/env bash
set -euo pipefail

echo "Running tests..."
# Ensure we're in the project root directory
cd "$(dirname "$0")/.."
npm exec jest
