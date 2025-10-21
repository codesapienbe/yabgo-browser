#!/usr/bin/env bash
set -euo pipefail

echo "Copying assets..."
cp src/renderer/index.html dist/ && cp src/renderer/styles.css dist/ && cp -r assets dist/assets || true
echo "Assets copied!"
