# Code Signing Guide for YABGO Browser

This guide explains how to sign your application for distribution on various platforms and app stores.

## Table of Contents

- [Windows Code Signing](#windows-code-signing)
  - [Microsoft Store](#microsoft-store)
  - [Standard Windows Distribution](#standard-windows-distribution)
- [Linux Code Signing](#linux-code-signing)
  - [Snap Store](#snap-store)
  - [Flathub](#flathub)
  - [AppImage Signing](#appimage-signing)
- [macOS Code Signing](#macos-code-signing)
- [CI/CD Integration](#cicd-integration)

---

## Windows Code Signing

### Prerequisites

1. **Code Signing Certificate** - You need an EV (Extended Validation) or OV (Organization Validation) certificate
2. **Certificate Providers**:
   - DigiCert (~$400/year)
   - Sectigo (formerly Comodo) (~$200/year)
   - GlobalSign (~$300/year)
   - SSL.com (~$250/year)

### Microsoft Store

#### Step 1: Create Microsoft Partner Center Account

```bash
# Visit https://partner.microsoft.com/dashboard
# Cost: One-time $19 (individual) or $99 (company)
```

#### Step 2: Reserve App Name
1. Go to Partner Center Dashboard
2. Click "Create a new app"
3. Reserve name: "YABGO Browser"
4. Set age rating and category

#### Step 3: Configure for Microsoft Store

Update `package.json`:

```json
{
  "build": {
    "appx": {
      "applicationId": "YABGOBrowser",
      "displayName": "YABGO Browser",
      "publisher": "CN=YOUR_PUBLISHER_ID",
      "publisherDisplayName": "Codesapien Network",
      "identityName": "CodesapienNetwork.YABGOBrowser",
      "languages": ["en-US"],
      "addAutoLaunchExtension": false
    }
  }
}
```

#### Step 4: Build APPX Package

```bash
# Install dependencies
npm install

# Build for Microsoft Store
npm run build:store
```

#### Step 5: Submit to Microsoft Store

1. Go to Partner Center → Your App → Submissions
2. Upload the `.appx` or `.msix` file from `release/` directory
3. Fill in app description, screenshots, privacy policy
4. Submit for certification (typically 24-48 hours)

### Standard Windows Distribution (Non-Store)

#### Step 1: Obtain Code Signing Certificate

```bash
# Option A: Use SSL.com eSigner (Cloud-based)
# No USB token required, works great for CI/CD

# Option B: Traditional Certificate (USB Token)
# Physical token shipped to you
```

#### Step 2: Configure Signing in package.json

```json
{
  "build": {
    "win": {
      "target": ["nsis", "msi"],
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "",
      "signingHashAlgorithms": ["sha256"],
      "signDlls": true,
      "rfc3161TimeStampServer": "http://timestamp.digicert.com"
    }
  }
}
```

#### Step 3: Use Environment Variables (Recommended)

```bash
# Set certificate password as environment variable
export WIN_CSC_LINK="/path/to/certificate.pfx"
export WIN_CSC_KEY_PASSWORD="your_certificate_password"

# Or use cloud signing
export WIN_CSC_LINK="https://cloud-signing-service/cert"
export WIN_CSC_KEY_PASSWORD="api_key"

# Build signed installer
npm run build
```

#### Step 4: Verify Signature

```powershell
# On Windows, verify the signature
signtool verify /pa "YABGO Browser Setup 1.1.1.exe"

# Should show: "Successfully verified"
```

---

## Linux Code Signing

### Snap Store

#### Step 1: Create Snapcraft Account

```bash
# Visit https://snapcraft.io/
# Create account with Ubuntu SSO
```

#### Step 2: Install Snapcraft

```bash
sudo snap install snapcraft --classic
sudo snap install multipass
```

#### Step 3: Create snapcraft.yaml

Create `snap/snapcraft.yaml`:

```yaml
name: yabgo-browser
version: '1.1.1'
summary: Yet Another Browser to Go and Visit
description: |
  A lightning-fast, gesture-driven web browser built for the modern user.
  Features AI-powered assistant, MCP integration, and beautiful minimal interface.

grade: stable
confinement: strict
base: core22
architectures:
  - build-on: amd64

apps:
  yabgo-browser:
    command: yabgo-browser
    extensions: [gnome]
    plugs:
      - browser-support
      - network
      - network-bind
      - home
      - removable-media
      - audio-playback
      - pulseaudio
      - desktop
      - desktop-legacy
      - x11
      - unity7
      - wayland

parts:
  yabgo-browser:
    plugin: nodejs
    nodejs-version: "20"
    source: .
    build-packages:
      - build-essential
      - libsqlite3-dev
    stage-packages:
      - libsqlite3-0
      - libgtk-3-0
      - libnotify4
      - libnss3
      - libxss1
      - libxtst6
      - xdg-utils
      - libatspi2.0-0
      - libuuid1
      - libsecret-1-0
    override-build: |
      npm ci
      npm run build
      craftctl default
```

#### Step 4: Build and Upload Snap

```bash
# Build snap package
snapcraft

# Login to Snapcraft
snapcraft login

# Upload to store
snapcraft upload --release=stable yabgo-browser_1.1.1_amd64.snap

# Check status
snapcraft status yabgo-browser
```

#### Step 5: Automatic Signing

Snapcraft **automatically signs** your snap during upload. No manual signing required!

### Flathub

#### Step 1: Fork Flathub Repository

```bash
# Visit https://github.com/flathub/flathub
# Fork the repository
```

#### Step 2: Create Flatpak Manifest

Create `com.yabgo.Browser.yml`:

```yaml
app-id: com.yabgo.Browser
runtime: org.freedesktop.Platform
runtime-version: '23.08'
sdk: org.freedesktop.Sdk
base: org.electronjs.Electron2.BaseApp
base-version: '23.08'
command: yabgo-browser
separate-locales: false

finish-args:
  - --share=ipc
  - --socket=x11
  - --socket=wayland
  - --socket=pulseaudio
  - --share=network
  - --device=dri
  - --filesystem=xdg-download:rw
  - --filesystem=xdg-documents:rw
  - --talk-name=org.freedesktop.Notifications
  - --talk-name=org.kde.StatusNotifierWatcher
  - --own-name=org.mpris.MediaPlayer2.yabgo

modules:
  - name: yabgo-browser
    buildsystem: simple
    build-commands:
      - npm ci --legacy-peer-deps
      - npm run build
      - install -Dm755 yabgo-browser /app/bin/yabgo-browser
      - install -Dm644 assets/icon.png /app/share/icons/hicolor/512x512/apps/com.yabgo.Browser.png
      - install -Dm644 com.yabgo.Browser.desktop /app/share/applications/com.yabgo.Browser.desktop
      - install -Dm644 com.yabgo.Browser.metainfo.xml /app/share/metainfo/com.yabgo.Browser.metainfo.xml
    sources:
      - type: git
        url: https://github.com/codesapienbe/yabgo-browser.git
        tag: v1.1.1
```

#### Step 3: Submit to Flathub

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/flathub.git
cd flathub

# Add your manifest
mkdir com.yabgo.Browser
cp /path/to/com.yabgo.Browser.yml com.yabgo.Browser/

# Commit and push
git add com.yabgo.Browser/
git commit -m "Add YABGO Browser"
git push origin master

# Create pull request on GitHub
# Flathub maintainers will review and merge
```

Flathub also **automatically signs** packages during the build process!

### AppImage Signing (GPG)

#### Step 1: Generate GPG Key

```bash
# Generate GPG key if you don't have one
gpg --full-generate-key

# Choose:
# - RSA and RSA (default)
# - 4096 bits
# - No expiration
# - Real name: Codesapien Network
# - Email: yilmaz@codesapien.net
```

#### Step 2: Export Public Key

```bash
# Export public key
gpg --armor --export yilmaz@codesapien.net > yabgo-browser.gpg

# Upload to keyserver
gpg --keyserver keyserver.ubuntu.com --send-keys YOUR_KEY_ID
```

#### Step 3: Sign AppImage

```bash
# Sign the AppImage
gpg --detach-sign --armor "YABGO Browser-1.1.1.AppImage"

# This creates: YABGO Browser-1.1.1.AppImage.sig
```

#### Step 4: Verify Signature

```bash
# Users can verify with:
gpg --verify "YABGO Browser-1.1.1.AppImage.sig" "YABGO Browser-1.1.1.AppImage"
```

#### Step 5: Update package.json

```json
{
  "build": {
    "linux": {
      "target": ["AppImage", "snap", "deb"],
      "category": "Network",
      "maintainer": "Codesapien Network <yilmaz@codesapien.net>",
      "vendor": "Codesapien Network",
      "synopsis": "Modern gesture-driven web browser",
      "description": "Yet Another Browser to Go and Visit - A lightning-fast, gesture-driven web browser with AI assistant and MCP integration"
    }
  }
}
```

---

## macOS Code Signing

### Prerequisites

1. **Apple Developer Account** ($99/year)
2. **Developer ID Certificate**
3. **Mac computer** or macOS VM

### Step 1: Get Developer ID Certificate

```bash
# Visit https://developer.apple.com/account
# Go to Certificates, Identifiers & Profiles
# Create "Developer ID Application" certificate
# Download and install in Keychain
```

### Step 2: Configure Signing

```json
{
  "build": {
    "mac": {
      "category": "public.app-category.productivity",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "notarize": {
        "teamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### Step 3: Create Entitlements File

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

### Step 4: Build and Notarize

```bash
# Set credentials
export APPLE_ID="your_apple_id@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"

# Build for macOS
npm run build:mac

# Notarization happens automatically
```

---

## CI/CD Integration

### GitHub Actions with Code Signing

Create `.github/workflows/release.yml`:

```yaml
name: Release with Code Signing

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      # Windows signing
      - name: Setup Windows Signing (Windows only)
        if: matrix.os == 'windows-latest'
        env:
          WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
        run: |
          echo "Certificate configured"
      
      # macOS signing
      - name: Setup macOS Signing (macOS only)
        if: matrix.os == 'macos-latest'
        env:
          CSC_LINK: ${{ secrets.MAC_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          echo "Certificate configured"
      
      # Build
      - name: Build application
        run: npm run build
      
      # Upload artifacts
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.os }}-build
          path: release/*
```

### Required GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

**Windows:**
- `WIN_CSC_LINK` - Base64 encoded .pfx certificate OR URL to certificate
- `WIN_CSC_KEY_PASSWORD` - Certificate password

**macOS:**
- `MAC_CSC_LINK` - Base64 encoded .p12 certificate
- `MAC_CSC_KEY_PASSWORD` - Certificate password
- `APPLE_ID` - Apple ID email
- `APPLE_ID_PASSWORD` - App-specific password
- `APPLE_TEAM_ID` - Apple Team ID

**Linux:**
- GPG signing happens locally before upload
- Snap/Flatpak signing is automatic

### Encoding Certificates for GitHub Secrets

```bash
# Windows certificate
base64 -i certificate.pfx | pbcopy  # macOS
base64 -w 0 certificate.pfx  # Linux

# macOS certificate
base64 -i certificate.p12 | pbcopy  # macOS
base64 -w 0 certificate.p12  # Linux
```

---

## Quick Start Checklist

### For Windows (Microsoft Store)
- [ ] Create Partner Center account ($19-$99)
- [ ] Reserve app name
- [ ] Configure APPX in package.json
- [ ] Build and upload
- [ ] Submit for certification

### For Windows (Regular Distribution)
- [ ] Purchase code signing certificate (~$200-400/year)
- [ ] Add certificate to package.json
- [ ] Set environment variables
- [ ] Build signed installer
- [ ] Verify signature

### For Linux (Snap Store)
- [ ] Create Snapcraft account (free)
- [ ] Create snapcraft.yaml
- [ ] Build and upload snap
- [ ] Automatic signing by Snapcraft

### For Linux (Flathub)
- [ ] Fork Flathub repository
- [ ] Create Flatpak manifest
- [ ] Submit pull request
- [ ] Automatic signing by Flathub

### For AppImage
- [ ] Generate GPG key
- [ ] Sign AppImage
- [ ] Distribute public key
- [ ] Include signature file

---

## Cost Summary

| Platform | Cost | Renewal |
|----------|------|---------|
| Windows Code Signing | $200-400 | Yearly |
| Microsoft Store | $19-99 | One-time |
| macOS Developer | $99 | Yearly |
| Snap Store | Free | - |
| Flathub | Free | - |
| GPG Signing | Free | - |

---

## Support & Resources

- [Electron Builder Signing Docs](https://www.electron.build/code-signing)
- [Microsoft Partner Center](https://partner.microsoft.com/)
- [Snapcraft Documentation](https://snapcraft.io/docs)
- [Flathub Submission](https://github.com/flathub/flathub/wiki/App-Submission)
- [Apple Developer](https://developer.apple.com/)

---

**Need Help?** Contact: yilmaz@codesapien.net

