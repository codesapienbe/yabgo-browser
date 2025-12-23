#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/generate-pages.sh <version> <assets-dir> <out-dir>
# Example: scripts/generate-pages.sh v0.0.12 ./assets ./site

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <version> <assets-dir> <out-dir>"
  exit 2
fi

VERSION="$1"
ASSETS_DIR="$2"
OUT_DIR="$3"

RELEASE_DIR="$OUT_DIR/releases/${VERSION}"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
cp -r "$ASSETS_DIR"/* "$RELEASE_DIR/" || true

# Copy design assets
mkdir -p "$OUT_DIR/assets"
cp -f "scripts/templates/style.css" "$OUT_DIR/assets/style.css"
cp -f "scripts/templates/logo.svg" "$OUT_DIR/assets/logo.svg"

# Helper to produce human readable size and sha256
human_size() {
  if command -v numfmt >/dev/null 2>&1; then
    numfmt --to=iec --suffix=B --format="%.1f" "$1"
  else
    awk -v s="$1" 'function human(x){split("B KB MB GB TB",u); for(i=1;x>=1024&&i<5;i++)x/=1024; return sprintf("%.1f %s",x,u[i])} END{print human(s)}'
  fi
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    echo ""
  fi
}

# Build per-release HTML
cat > "$RELEASE_DIR/index.html" <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>YABGO Browser - Release %VERSION%</title>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo"><img src="/assets/logo.svg" alt="logo" width="36"></div>
      <div>
        <div class="title">YABGO Browser</div>
        <div class="subtitle">Download assets for release %VERSION%</div>
      </div>
    </div>

    <div class="release-card">
      <div class="release-head">
        <div class="release-title">Release %VERSION%</div>
        <div class="small">Tag: %VERSION%</div>
      </div>

      <div class="asset-list">
        <!-- ASSETS -->
      </div>
    </div>

    <div class="footer">Built artifacts are provided here for convenience. Prefer the release source for reproducibility.</div>
  </div>
</body>
</html>
HTML

# Insert assets list
ASSETS_HTML=""
for f in "$RELEASE_DIR"/*; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  size=$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f" 2>/dev/null || echo 0)
  hsize=$(human_size "$size")
  sha=$(sha256_of "$f")
  # Determine platform by name
  plat="File"
  if echo "$base" | grep -qi "\.apk$\|apk"; then plat="Android"; fi
  if echo "$base" | grep -qi "\.appimage$\|appimage"; then plat="Linux"; fi
  if echo "$base" | grep -qi "\.dmg$\|\.pkg$\|mac"; then plat="macOS"; fi
  if echo "$base" | grep -qi "\.exe$\|windows\|msi"; then plat="Windows"; fi

  ASSETS_HTML+=$(cat <<ITEM
  <div class="asset">
    <div class="asset-info">
      <div><strong>${base}</strong><div class="asset-meta">${plat} • ${hsize} • SHA256: <code style="font-family:var(--mono);">${sha}</code></div></div>
    </div>
    <div>
      <a class="btn" href="${base}" download>Download</a>
      <a class="btn secondary" href="${base}">Direct</a>
    </div>
  </div>
ITEM
)

done

# Insert the assets HTML into the release page
sed -i "s#<!-- ASSETS -->#${ASSETS_HTML}#g" "$RELEASE_DIR/index.html"

# Ensure top-level index exists and includes site header
if [ ! -f "$OUT_DIR/index.html" ]; then
  cat > "$OUT_DIR/index.html" <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>YABGO Browser Releases</title>
  <link rel="stylesheet" href="/assets/style.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo"><img src="/assets/logo.svg" alt="logo" width="36"></div>
      <div>
        <div class="title">YABGO Browser</div>
        <div class="subtitle">Official builds and downloads</div>
      </div>
    </div>

    <div class="releases" id="releases-root">
      <!-- RELEASES -->
    </div>

    <div class="footer">Releases are published from tags and include builds for Android, macOS, Windows, and Linux when available.</div>
  </div>
  <script src="/release.js"></script>
</body>
</html>
HTML
fi

# Add or update the release link in release.js (idempotent)
JS_POST="(function(){\n  const root=document.getElementById('releases-root'); if(!root) return;\n  const li=document.createElement('div'); li.innerHTML=\"<div class='release-card'><div class='release-head'><div class='release-title'>%VERSION%</div><div class='small'>Tag: %VERSION%</div></div><div class='asset-list'>\";\n  // fetch assets list and inject links (server-side already created pages)\n  li.innerHTML+=\"<div style='margin-top:12px'><a class='btn' href='./releases/%VERSION%/'>Open release page</a></div></div></div>\";\n  root.insertBefore(li, root.firstChild);\n})();"

if grep -q "release.js" "$OUT_DIR/release.js" 2>/dev/null; then
  # remove any existing entry for this version
  tmp=$(mktemp)
  sed "s/%VERSION%/${VERSION}/g" <<< "$JS_POST" > "$tmp"
  # Append to release.js so it populates the list on load
  cat "$tmp" >> "$OUT_DIR/release.js"
  rm -f "$tmp"
else
  # create a basic release.js
  cat > "$OUT_DIR/release.js" <<'JS'
(function(){
  const root=document.getElementById('releases-root'); if(!root) return;
})();
JS
  sed -i "1i $(sed 's/\/\/.*$//g' <<< "$JS_POST" | sed 's/"/\"/g')" "$OUT_DIR/release.js" || true
fi

echo "Generated pages for ${VERSION} in ${RELEASE_DIR}"
