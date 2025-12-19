#!/usr/bin/env bash
set -euo pipefail

# Helper to build and package releases using electron-builder
# Usage: ./scripts/build-release.sh [--mac|--win|--linux] [other electron-builder args]

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required. Please install Node.js (LTS) and npm."
  exit 1
fi

# Build app
echo "Building application (TypeScript + webpack)..."
npm run build

# Run electron-builder with passed args (defaults to all platforms)
echo "Packaging (electron-builder) with args: $@"
npx electron-builder "$@"

echo "Artifacts will be available under the 'release/' directory."
