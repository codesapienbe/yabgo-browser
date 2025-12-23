#!/usr/bin/env bash
set -euo pipefail

# Exit with non-zero if any staged file matches a forbidden pattern or contains private key markers
FORBIDDEN_PATH_PATTERNS=(
  "release.keystore"
  "android/keystores/"
  "android/keystore.properties"
  "*.jks"
  "*.p12"
  "*.pfx"
)

SECRET_CONTENT_PATTERNS=(
  "KEYSTORE_BASE64"
  "KEYSTORE_PASSWORD"
  "KEY_ALIAS"
  "KEY_PASSWORD"
  "-----BEGIN .*PRIVATE KEY"
  "-----BEGIN RSA PRIVATE KEY"
  "-----BEGIN PGP PRIVATE KEY BLOCK"
)

# get staged files (names only)
STAGED_FILES=$(git diff --cached --name-only) || true
if [ -z "$STAGED_FILES" ]; then
  # nothing staged
  exit 0
fi

FAIL=0

for FILE in $STAGED_FILES; do
  for PAT in "${FORBIDDEN_PATH_PATTERNS[@]}"; do
    # Use shell wildcard matching
    if [[ "$FILE" == $PAT ]]; then
      echo "ERROR: Forbidden file staged: $FILE (matches $PAT)"
      FAIL=1
    fi
  done

  # If file no longer exists in index (deleted), skip
  if ! git ls-files --error-unmatch -- "${FILE}" >/dev/null 2>&1; then
    continue
  fi

  # Check contents for sensitive markers (ignore binary files)
  if git show :"$FILE" | rg -I -n -e "${SECRET_CONTENT_PATTERNS[0]}" -e "${SECRET_CONTENT_PATTERNS[1]}" -e "${SECRET_CONTENT_PATTERNS[2]}" -e "${SECRET_CONTENT_PATTERNS[3]}" -e "${SECRET_CONTENT_PATTERNS[4]}" -e "${SECRET_CONTENT_PATTERNS[5]}" -e "${SECRET_CONTENT_PATTERNS[6]}" >/dev/null 2>&1; then
    echo "ERROR: Suspicious secret-like content detected in staged file: $FILE"
    FAIL=1
  fi

  # Also check for very long base64-like lines which might be encoded keys
  if git show :"$FILE" | awk 'length($0) > 500 {print NR ":" substr($0,1,200) "..."; exit 0 }' | grep -q . >/dev/null 2>&1; then
    echo "ERROR: Long line detected (possible base64) in staged file: $FILE"
    FAIL=1
  fi

done

if [ "$FAIL" -eq 1 ]; then
  echo "\nCommit aborted: remove sensitive files or content before committing. See docs/ANDROID.md for guidance."
  exit 2
fi

exit 0
