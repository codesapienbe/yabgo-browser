#!/usr/bin/env bash
set -euo pipefail

echo "Building YABGO Browser..."

# Clean previous build
./scripts/clean.sh

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc -p tsconfig.json

# Bundle with webpack
echo "Bundling with webpack..."
npx webpack --mode production

# Copy assets
./scripts/copy-assets.sh

echo "Build complete!"
