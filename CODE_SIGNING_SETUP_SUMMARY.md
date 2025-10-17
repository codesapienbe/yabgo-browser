# Code Signing Setup Summary

## ✅ What Has Been Configured

Your YABGO Browser project is now fully configured for code signing and app store distribution across all major platforms.

---

## 📦 New Files Created

### Documentation
1. **`docs/CODE_SIGNING_GUIDE.md`** - Comprehensive guide covering:
   - Windows code signing (Microsoft Store & standard distribution)
   - Linux code signing (Snap Store, Flathub, AppImage with GPG)
   - macOS code signing (Apple Developer)
   - CI/CD integration with GitHub Actions
   - Step-by-step instructions for each platform

2. **`SIGNING_QUICKSTART.md`** - Quick start guide with:
   - Platform-by-platform quick start instructions
   - Cost comparison table
   - Recommended strategies
   - Common issues and solutions

3. **`CODE_SIGNING_SETUP_SUMMARY.md`** - This file

### Configuration Files

#### Snap Store
- **`snap/snapcraft.yaml`** - Complete Snap package configuration
  - App metadata and description
  - Build instructions
  - Confinement and security settings
  - System integrations (desktop, browser support, etc.)

#### Flathub
- **`com.yabgo.Browser.yml`** - Flatpak manifest for Flathub submission
- **`com.yabgo.Browser.desktop`** - Desktop entry file
- **`com.yabgo.Browser.metainfo.xml`** - AppStream metadata

#### macOS
- **`build/entitlements.mac.plist`** - macOS entitlements for code signing

#### Scripts
- **`scripts/build-store.sh`** - Build for Microsoft Store (APPX)
- **`scripts/sign-appimage.sh`** - Interactive GPG signing for AppImage

---

## ⚙️ Updated Files

### package.json
Added configurations for:

1. **New Build Scripts**:
   ```json
   {
     "build:store": "bash scripts/build-store.sh",
     "build:snap": "snapcraft",
     "build:sign": "bash scripts/sign-appimage.sh"
   }
   ```

2. **Windows Signing Configuration**:
   ```json
   {
     "win": {
       "signingHashAlgorithms": ["sha256"],
       "signDlls": true,
       "rfc3161TimeStampServer": "http://timestamp.digicert.com"
     }
   }
   ```

3. **Linux Metadata**:
   ```json
   {
     "linux": {
       "category": "Network",
       "maintainer": "Codesapien Network <yilmaz@codesapien.net>",
       "vendor": "Codesapien Network",
       "synopsis": "Modern gesture-driven web browser"
     }
   }
   ```

4. **Microsoft Store (APPX) Configuration**:
   ```json
   {
     "appx": {
       "applicationId": "YABGOBrowser",
       "displayName": "YABGO Browser",
       "publisherDisplayName": "Codesapien Network"
     }
   }
   ```

5. **macOS Code Signing**:
   ```json
   {
     "mac": {
       "hardenedRuntime": true,
       "entitlements": "build/entitlements.mac.plist"
     }
   }
   ```

### README.md
- Added Snap Store installation instructions
- Added App Store availability section
- Mentioned code signing and verified distributions

---

## 🚀 Available Commands

### Building

```bash
# Standard build (Linux + Windows, unsigned or signed with env vars)
npm run build

# Build for Microsoft Store (APPX)
npm run build:store

# Build Snap package
npm run build:snap

# Sign AppImage with GPG
npm run build:sign
```

### Development

```bash
# Development mode
npm run dev

# Production test run
npm run prod

# Run tests
npm test
```

---

## 🔐 Signing Options by Platform

### 1. Windows

#### Option A: Microsoft Store (Easiest)
- **Cost**: $19-99 one-time
- **Signing**: Automatic by Microsoft
- **Command**: `npm run build:store`
- **Distribution**: Microsoft Store only

#### Option B: Code Signing Certificate
- **Cost**: $200-400/year
- **Signing**: Via environment variables
- **Setup**: Set `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`
- **Command**: `npm run build`
- **Distribution**: Anywhere

### 2. Linux

#### Option A: Snap Store (Recommended)
- **Cost**: Free
- **Signing**: Automatic by Snapcraft
- **Command**: `npm run build:snap`
- **Distribution**: All major Linux distros

#### Option B: Flathub
- **Cost**: Free
- **Signing**: Automatic by Flathub
- **Setup**: Submit PR with `com.yabgo.Browser.yml`
- **Distribution**: All Linux distros with Flatpak

#### Option C: AppImage with GPG
- **Cost**: Free
- **Signing**: Manual with GPG
- **Command**: `npm run build:sign`
- **Distribution**: Self-hosted or GitHub Releases

### 3. macOS

- **Cost**: $99/year (Apple Developer Program)
- **Signing**: Via environment variables
- **Setup**: Set `CSC_LINK`, `APPLE_ID`, `APPLE_ID_PASSWORD`, `APPLE_TEAM_ID`
- **Command**: `npm run build`
- **Distribution**: Direct download or Mac App Store

---

## 📝 Next Steps to Publish

### For Microsoft Store

1. Create account at https://partner.microsoft.com/dashboard ($19-99)
2. Reserve app name "YABGO Browser"
3. Run `npm run build:store`
4. Upload `.appx` file from `release/` directory
5. Fill in app details, screenshots, privacy policy
6. Submit for certification (24-48 hours)

### For Snap Store

1. Create Ubuntu SSO account at https://snapcraft.io/
2. Install snapcraft: `sudo snap install snapcraft --classic`
3. Build: `npm run build:snap`
4. Login: `snapcraft login`
5. Upload: `snapcraft upload --release=stable yabgo-browser_1.1.1_amd64.snap`
6. **Done!** App is live immediately

### For Flathub

1. Fork https://github.com/flathub/flathub
2. Copy `com.yabgo.Browser.yml` to new folder
3. Add desktop file and metainfo.xml
4. Submit pull request
5. Wait for review (1-2 weeks)

### For AppImage (Self-Distribution)

1. Generate GPG key: `gpg --full-generate-key`
2. Build: `npm run build`
3. Sign: `npm run build:sign`
4. Upload both files to GitHub Releases:
   - `YABGO Browser-1.1.1.AppImage`
   - `YABGO Browser-1.1.1.AppImage.sig`
5. Export and share your public key

---

## 🔑 Required Credentials

### Windows Code Signing (Optional)
```bash
export WIN_CSC_LINK="/path/to/certificate.pfx"
export WIN_CSC_KEY_PASSWORD="your_password"
```

### macOS Code Signing (Optional)
```bash
export CSC_LINK="/path/to/certificate.p12"
export CSC_KEY_PASSWORD="your_password"
export APPLE_ID="your_apple_id@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

### Snap Store (Required)
- Ubuntu SSO account (free)
- Run `snapcraft login`

### GPG for AppImage (Optional)
- GPG key pair (generate with `gpg --full-generate-key`)

---

## 💰 Cost Summary

| Platform/Method | Initial Cost | Annual Cost | Complexity |
|----------------|-------------|-------------|------------|
| Snap Store | **Free** | Free | ⭐ Easy |
| Flathub | **Free** | Free | ⭐⭐ Medium |
| AppImage + GPG | **Free** | Free | ⭐ Easy |
| Microsoft Store | $19-99 | Free | ⭐⭐ Easy |
| Windows Code Signing | $200-400 | $200-400 | ⭐⭐⭐⭐ Hard |
| macOS App Store | $99 | $99 | ⭐⭐⭐ Medium |

### Recommended Budget Strategy

**Free (Open Source)**:
- Snap Store (Linux)
- Flathub (Linux)
- AppImage with GPG (Linux)
- Unsigned builds for Windows/macOS with checksums

**Budget ($19-99)**:
- Snap Store (Linux) - Free
- Microsoft Store (Windows) - $19-99
- Self-signed AppImage (Linux) - Free

**Professional ($400-500/year)**:
- All platforms with official signing
- Windows Code Signing - $300/year
- Apple Developer - $99/year
- Linux stores (free)

---

## 🎯 Easiest Path to Start TODAY

### Recommended: Snap Store (5 minutes)

```bash
# 1. Create account
# Visit: https://snapcraft.io/

# 2. Install snapcraft
sudo snap install snapcraft --classic

# 3. Build snap
cd /home/codesapienbe/Projects/yabgo-browser
snapcraft

# 4. Upload
snapcraft login
snapcraft upload --release=stable yabgo-browser_1.1.1_amd64.snap
```

**Your app is now live on Snap Store with automatic signing!** 🎉

---

## 📚 Documentation Reference

- **Complete Guide**: [docs/CODE_SIGNING_GUIDE.md](docs/CODE_SIGNING_GUIDE.md)
- **Quick Start**: [SIGNING_QUICKSTART.md](SIGNING_QUICKSTART.md)
- **Development**: [DEVELOPMENT.md](DEVELOPMENT.md)
- **MCP Integration**: [docs/MCP_INTEGRATION.md](docs/MCP_INTEGRATION.md)

---

## ✅ Verification Checklist

Before publishing, verify:

- [ ] Application builds successfully: `npm run build`
- [ ] Version number is correct in `VERSION` and `package.json`
- [ ] Icons are present in `assets/` directory
- [ ] Desktop files and metadata are correct
- [ ] Privacy policy is ready (required for stores)
- [ ] Screenshots prepared (required for stores)
- [ ] App description written (required for stores)
- [ ] Age rating determined (required for stores)

---

## 🐛 Troubleshooting

### Snap build fails
```bash
# Install multipass if missing
sudo snap install multipass
```

### GPG signing fails
```bash
# Generate a key first
gpg --full-generate-key
```

### Windows signing not working
```bash
# Verify environment variables are set
echo $WIN_CSC_LINK
echo $WIN_CSC_KEY_PASSWORD
```

### Need more help?
- Check: [docs/CODE_SIGNING_GUIDE.md](docs/CODE_SIGNING_GUIDE.md)
- Issues: https://github.com/codesapienbe/yabgo-browser/issues
- Email: yilmaz@codesapien.net

---

## 🎉 Success!

Your YABGO Browser is now ready for app store distribution with:
- ✅ Complete signing configurations
- ✅ Store-ready build scripts
- ✅ Comprehensive documentation
- ✅ Multiple distribution options
- ✅ Free and paid paths available

**Choose your platform and start publishing!** 🚀

---

**Created**: October 18, 2025  
**Version**: 1.1.1  
**Status**: Ready for Distribution

