#!/usr/bin/env bash
set -euo pipefail

# Build script for Microsoft Store (APPX) and other stores
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f VERSION ]; then
  VERSION_STR="$(cat VERSION)"
else
  VERSION_STR="$(node -p "require('./package.json').version")"
fi

# Strip leading 'v' if present
VERSION_NUM="${VERSION_STR#v}"
echo "Building version: $VERSION_NUM for app stores"

echo "Cleaning..."
npm run clean

echo "TypeScript compile..."
tsc -p tsconfig.main.json

echo "Webpack bundle..."
webpack --mode production

echo "Copying assets..."
npm run copy:assets

echo ""
echo "================================================"
echo "Building for Microsoft Store (APPX)..."
echo "================================================"
echo ""

# Check if publisher certificate is configured
if [ -n "${WIN_CSC_LINK:-}" ]; then
  echo "✓ Certificate configured via WIN_CSC_LINK"
else
  echo "⚠️  No certificate found. Set WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD environment variables."
  echo "   For testing, you can build unsigned by continuing."
  read -p "Continue without signing? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Build APPX for Microsoft Store
electron-builder --win appx --x64 --publish never --config.extraMetadata.version="${VERSION_NUM}"

echo ""
echo "================================================"
echo "Build complete!"
echo "================================================"
echo ""
echo "Microsoft Store package:"
echo "  release/*.appx"
echo ""
echo "Next steps:"
echo "1. Go to https://partner.microsoft.com/dashboard"
echo "2. Create a new submission"
echo "3. Upload the .appx file"
echo "4. Fill in app details and screenshots"
echo "5. Submit for certification"
echo ""
echo "For more details, see: docs/CODE_SIGNING_GUIDE.md"

