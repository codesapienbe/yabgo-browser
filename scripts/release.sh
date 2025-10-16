#!/usr/bin/env bash
set -euo pipefail

# Minimal release script — always create a git tag and push it to origin.
# Usage: ./scripts/release.sh [version]
# If version is omitted the script reads the VERSION file in the repo root.

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [version]" >&2
  exit 2
fi

if [[ $# -eq 1 ]]; then
  VERSION="$1"
else
  if [[ ! -f VERSION ]]; then
    echo "ERROR: VERSION file not found in project root" >&2
    exit 2
  fi
  VERSION="$(cat VERSION)"
fi

echo "Creating and pushing tag: $VERSION"

git tag "$VERSION"
git push origin "$VERSION"

exit 0
