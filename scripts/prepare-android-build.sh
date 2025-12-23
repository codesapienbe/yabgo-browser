#!/usr/bin/env bash
set -euo pipefail

# Prepare a reproducible Android build (suitable for F‑Droid / distro builds)
# - Installs node deps
# - Builds web assets into dist/
# - Ensures Capacitor copies the www assets into android/

echo "Preparing Android build: installing node modules and building web assets..."
npm ci
npm run build

echo "Copying assets to Android project (Capacitor)..."
# Try to add the platform if missing (does nothing if platform exists)
if [ ! -d "android" ]; then
  npx cap init "YABGO Browser" io.codesapienbe.yabgo --web-dir=dist || true
  npx cap add android || true
fi
npx cap copy
npx cap sync

echo "Prepare complete. Commit the generated android/ folder if you want F‑Droid or other distros to build from source."
