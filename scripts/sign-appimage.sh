#!/usr/bin/env bash
set -euo pipefail

# Script to sign AppImage with GPG
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f VERSION ]; then
  VERSION_STR="$(cat VERSION)"
else
  VERSION_STR="$(node -p "require('./package.json').version")"
fi

VERSION_NUM="${VERSION_STR#v}"
APPIMAGE_FILE="release/YABGO Browser-${VERSION_NUM}.AppImage"

echo "================================================"
echo "AppImage GPG Signing Tool"
echo "================================================"
echo ""

# Check if AppImage exists
if [ ! -f "$APPIMAGE_FILE" ]; then
  echo "❌ Error: AppImage not found at: $APPIMAGE_FILE"
  echo ""
  echo "Please build the AppImage first:"
  echo "  npm run build"
  exit 1
fi

echo "Found AppImage: $APPIMAGE_FILE"
echo ""

# Check if GPG is installed
if ! command -v gpg &> /dev/null; then
  echo "❌ Error: GPG not installed"
  echo ""
  echo "Install GPG:"
  echo "  Ubuntu/Debian: sudo apt install gnupg"
  echo "  Fedora: sudo dnf install gnupg2"
  echo "  Arch: sudo pacman -S gnupg"
  exit 1
fi

# Check for existing GPG keys
if ! gpg --list-secret-keys &> /dev/null; then
  echo "⚠️  No GPG keys found"
  echo ""
  echo "Generate a GPG key:"
  echo "  gpg --full-generate-key"
  echo ""
  echo "Choose:"
  echo "  - RSA and RSA (default)"
  echo "  - 4096 bits"
  echo "  - No expiration"
  echo "  - Real name: Codesapien Network"
  echo "  - Email: yilmaz@codesapien.net"
  echo ""
  read -p "Would you like to generate a key now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    gpg --full-generate-key
  else
    exit 1
  fi
else
  echo "✅ GPG keys found! You can use any existing key."
  echo ""
  echo "💡 Note: If you already have a key (e.g., for Java code signing),"
  echo "   you can reuse it. GPG keys work for signing any type of file."
  echo ""
fi

# List available keys
echo "Available GPG keys:"
echo ""
gpg --list-secret-keys --keyid-format LONG
echo ""

# Ask which key to use
read -p "Enter the email address of the key to use: " KEY_EMAIL

# Verify key exists
if ! gpg --list-secret-keys "$KEY_EMAIL" &> /dev/null; then
  echo "❌ Error: Key not found for: $KEY_EMAIL"
  exit 1
fi

echo ""
echo "Signing AppImage with key: $KEY_EMAIL"
echo ""

# Sign the AppImage
# Using --armor creates a .asc file (ASCII armored signature)
if gpg --detach-sign --armor --default-key "$KEY_EMAIL" "$APPIMAGE_FILE" 2>&1; then
  SIGNATURE_FILE="${APPIMAGE_FILE}.asc"
  
  echo ""
  echo "✅ Successfully signed!"
  echo ""
  echo "Files created:"
  echo "  AppImage:   $APPIMAGE_FILE"
  echo "  Signature:  $SIGNATURE_FILE"
  echo ""
  echo "Verify signature:"
  echo "  gpg --verify \"$SIGNATURE_FILE\" \"$APPIMAGE_FILE\""
  echo ""
  echo "Export public key for distribution:"
  echo "  gpg --armor --export $KEY_EMAIL > yabgo-browser.gpg"
  echo ""
  echo "Upload public key to keyserver (optional):"
  echo "  gpg --keyserver keyserver.ubuntu.com --send-keys \$(gpg --list-keys $KEY_EMAIL | grep -oP '(?<=pub   )[A-F0-9]+')"
  echo ""
  echo "Users can verify the AppImage with:"
  echo "  1. Import your public key: gpg --import yabgo-browser.gpg"
  echo "  2. Verify signature: gpg --verify \"$SIGNATURE_FILE\" \"$APPIMAGE_FILE\""
  echo ""
  echo "📦 Ready to distribute both files!"
else
  echo ""
  echo "❌ Error: Signing failed"
  echo ""
  echo "Possible reasons:"
  echo "  - Wrong passphrase entered"
  echo "  - GPG agent not running"
  echo "  - Key doesn't have signing capability"
  echo ""
  echo "Try running GPG directly to see the error:"
  echo "  gpg --detach-sign --armor --default-key $KEY_EMAIL \"$APPIMAGE_FILE\""
  exit 1
fi

