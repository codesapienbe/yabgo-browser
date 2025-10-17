#!/usr/bin/env bash
set -euo pipefail

# Build script that reads version from VERSION and builds Linux and Windows artifacts.
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f VERSION ]; then
  VERSION_STR="$(cat VERSION)"
else
  VERSION_STR="$(node -p "require('./package.json').version")"
fi

# electron-builder expects a numeric version (no leading 'v'). Strip a leading 'v' if present.
VERSION_NUM="${VERSION_STR#v}"
if [ "$VERSION_NUM" != "$VERSION_STR" ]; then
  echo "Detected leading 'v' in VERSION; using numeric version: $VERSION_NUM"
else
  echo "Building version: $VERSION_NUM"
fi

echo "Cleaning..."
npm run clean

echo "TypeScript compile..."
tsc -p tsconfig.main.json

echo "Webpack bundle..."
webpack --mode production

echo "Copying assets..."
npm run copy:assets

echo "Building Linux artifacts (AppImage)..."
electron-builder --linux --publish never --config.extraMetadata.version="v${VERSION_STR}"

echo "Preparing Windows build..."
# Re-check wine presence; attempt install if sudo is available
if command -v wine >/dev/null 2>&1; then
  echo "wine detected"
else
  echo "wine not found. Attempting to install libwine or wine32 (requires sudo)."
  if sudo -n true 2>/dev/null; then
    sudo apt-get update || true
    # Try to install libwine (replacement on newer Ubuntu)
    sudo apt-get install -y --no-install-recommends libwine || true
    # Ensure i386 architecture for wine32 if needed
    if ! dpkg --print-foreign-architectures | grep -q i386; then
      sudo dpkg --add-architecture i386 || true
      sudo apt-get update || true
      sudo apt-get install -y wine32:i386 || true
    fi
  else
    echo "No sudo available; will skip automatic wine installation."
  fi
fi

# Final check: if wine is available proceed with Windows build, otherwise skip it gracefully
if command -v wine >/dev/null 2>&1; then
  echo "Building Windows artifacts (nsis)..."
  electron-builder --win --publish never --config.extraMetadata.version="v${VERSION_STR}" || {
    echo "Windows build failed. If the error mentions wine32, install libwine or enable i386 and install wine32:i386."
    exit 1
  }
else
  echo "Skipping Windows build: wine not available. To enable Windows builds locally install libwine or enable i386 and install wine32:i386."
fi

echo "Build complete. Artifacts are in the release/ directory."


