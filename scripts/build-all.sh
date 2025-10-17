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
# Use the numeric version (no leading 'v') when passing to electron-builder
electron-builder --linux --publish never --config.extraMetadata.version="${VERSION_NUM}"

echo "Preparing Windows build..."
# Re-check wine presence; attempt install if sudo is available
if command -v wine >/dev/null 2>&1; then
  echo "wine detected"
else
  echo "wine not found. Attempting to install libwine or wine64 (requires sudo)."
  if sudo -n true 2>/dev/null; then
    # Install Wine from WineHQ (recommended) with i386 multiarch enabled
    sudo dpkg --add-architecture i386 || true
    sudo mkdir -pm755 /etc/apt/keyrings || true
    sudo wget -O /etc/apt/keyrings/winehq-archive.key https://dl.winehq.org/wine-builds/winehq.key || true
    sudo wget -NP /etc/apt/sources.list.d/ https://dl.winehq.org/wine-builds/ubuntu/dists/$(lsb_release -cs)/winehq-$(lsb_release -cs).sources || true
    sudo apt update || true
    sudo apt install --install-recommends -y winehq-stable || true
  else
    echo "No sudo available; will skip automatic wine installation."
  fi
fi

# Final check: if wine is available proceed with Windows build, otherwise skip it gracefully
if command -v wine >/dev/null 2>&1; then
  echo "Building Windows artifacts (nsis)..."
  # Use the numeric version (no leading 'v') when passing to electron-builder
  electron-builder --win --publish never --config.extraMetadata.version="${VERSION_NUM}" || {
    echo "Windows build failed. If the error mentions wine64, install libwine or install wine64."
    exit 1
  }
else
  echo "Skipping Windows build: wine not available. To enable Windows builds locally install libwine or install wine64."
fi

echo "Build complete. Artifacts are in the release/ directory."


