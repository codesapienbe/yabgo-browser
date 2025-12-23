#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/generate-pages.sh <version> <assets-dir> <out-dir>
# Example: scripts/generate-pages.sh v0.0.12 ./assets ./site

VERSION="$1"
ASSETS_DIR="$2"
OUT_DIR="$3"

mkdir -p "$OUT_DIR/releases/$VERSION"
cp -r "$ASSETS_DIR"/* "$OUT_DIR/releases/$VERSION/"

# Create a simple index for this release
cat > "$OUT_DIR/releases/$VERSION/index.html" <<EOF
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>YABGO Browser - Release ${VERSION}</title>
</head>
<body>
  <h1>YABGO Browser — Release ${VERSION}</h1>
  <p>Assets built from tag <strong>${VERSION}</strong></p>
  <ul>
  $(for f in "$OUT_DIR/releases/$VERSION"/*; do
      base=$(basename "$f")
      echo "    <li><a href=\"${base}\">${base}</a></li>"
    done)
  </ul>
  <p><a href="/">All releases</a></p>
</body>
</html>
EOF

# Ensure a top-level releases index exists (append or create)
mkdir -p "$OUT_DIR"
if [ ! -f "$OUT_DIR/index.html" ]; then
  cat > "$OUT_DIR/index.html" <<HTML
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>YABGO Browser Releases</title>
</head>
<body>
  <h1>YABGO Browser — Releases</h1>
  <ul id="releases-list">
  </ul>
</body>
</html>
HTML
fi

# Insert this release into the releases index (idempotent)
# We'll create a small JS file to dynamically list available releases (keeps index simple)
cat > "$OUT_DIR/release.js" <<JS
(function(){
  const list = document.getElementById('releases-list');
  if (!list) return;
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = './releases/${VERSION}/';
  a.textContent = '${VERSION}';
  li.appendChild(a);
  list.insertBefore(li, list.firstChild);
})();
JS

# If not already included, inject the script tag into index.html
if ! grep -q "release.js" "$OUT_DIR/index.html" 2>/dev/null; then
  sed -i "s#</body>#  <script src=\"/release.js\"></script>\n</body>#" "$OUT_DIR/index.html"
fi

echo "Generated pages for ${VERSION} in ${OUT_DIR}/releases/${VERSION}"