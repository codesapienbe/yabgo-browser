#!/usr/bin/env bash
set -euo pipefail

## Ensure a writable per-user config directory exists. Prefer $HOME if set, else fall back to /tmp.
HOME_DIR="${HOME:-/tmp}"
if mkdir -p "${HOME_DIR}/.yabgo" 2>/dev/null; then
    :
else
    mkdir -p "/tmp/.yabgo" 2>/dev/null || true
fi

# If XAUTHORITY was bind-mounted, ensure env points to it and the file exists
if [ -n "${XAUTHORITY:-}" ] && [ -f "${XAUTHORITY}" ]; then
    export XAUTHORITY="${XAUTHORITY}"
else
    unset XAUTHORITY 2>/dev/null || true
fi

# Start pulseaudio if available (non-fatal)
if command -v pulseaudio >/dev/null 2>&1; then
    pulseaudio --start || true
fi

# Run the Electron app
if command -v npx >/dev/null 2>&1; then
    exec npx electron . --no-sandbox
else
    exec node ./dist/main/main.js
fi


