#!/usr/bin/env bash
set -euo pipefail

echo "Cleaning build artifacts..."
rm -rf dist release
rm -rf node_modules
rm -rf package-lock.json
rm -rf yarn.lock
rm -rf npm-debug.log*
rm -rf yarn-debug.log*
rm -rf yarn-error.log*
rm -rf .npm
rm -rf .yarn
rm -rf .parcel-cache
rm -rf .cache
echo "Clean complete!"
