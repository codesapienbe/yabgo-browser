#!/usr/bin/env bash
set -euo pipefail

# Simple build script for Docker and local development
echo "Building application..."
npm run build

echo "Building Docker image..."
docker build -t yabgo-browser:latest .

echo "Build complete!"


