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

echo "Checking remote for latest tags..."

# Fetch remote tags to ensure we have up-to-date tag list
git fetch --tags origin

# Find latest remote tag (lexicographically by version-like tags)
LATEST_REMOTE_TAG=$(git ls-remote --tags --refs origin | awk -F"/" '{print $3}' | grep -E '^v?[0-9]+(\.[0-9]+)*$' | sort -V | tail -n1 || true)

if [[ -n "$LATEST_REMOTE_TAG" ]]; then
  echo "Latest remote tag: $LATEST_REMOTE_TAG"
  if [[ "$LATEST_REMOTE_TAG" == "$VERSION" ]]; then
    echo "ERROR: Version $VERSION already exists on remote."
    echo "Please update the VERSION file to a newer version before releasing." >&2
    exit 1
  fi
  # If remote tag is greater than local VERSION based on sort -V, prompt user
  if [[ "$(printf "%s\n%s" "$LATEST_REMOTE_TAG" "$VERSION" | sort -V | tail -n1)" == "$LATEST_REMOTE_TAG" && "$LATEST_REMOTE_TAG" != "$VERSION" ]]; then
    echo "Remote has a newer tag ($LATEST_REMOTE_TAG) than local VERSION ($VERSION)."
    echo -n "Would you like to update the VERSION file to a newer version now? [y/N]: "
    read -r reply || reply="n"
    if [[ "$reply" =~ ^[Yy]$ ]]; then
      echo -n "Enter new version (e.g. v1.2.3): "
      read -r new_version
      if [[ -z "$new_version" ]]; then
        echo "No version entered. Aborting." >&2
        exit 1
      fi
      echo "$new_version" > VERSION
      git add VERSION
      git commit -m "chore(release): bump VERSION to $new_version"
      VERSION="$new_version"
      echo "VERSION updated to $new_version and committed. Continuing with release..."
    else
      echo "Aborting release. Update VERSION and try again." >&2
      exit 1
    fi
  fi
fi

echo "Creating and pushing tag: $VERSION"

# Attempt to sync package.json (and VERSION) before tagging so package.json.version matches the release
if command -v node >/dev/null 2>&1; then
  echo "Syncing package.json and VERSION to $VERSION..."
  # Use the bump script shipped in scripts/; it strips a leading 'v' if present
  node "$(dirname "$0")/bump-version.js" "$VERSION" || echo "Warning: bump-version failed, continuing..."
else
  echo "Node not available; skipping package.json bump"
fi

git tag "$VERSION"
git push origin "$VERSION"

exit 0
