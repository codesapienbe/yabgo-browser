# Code Signing Quick Start Guide

This guide will help you quickly set up code signing for YABGO Browser and publish to app stores.

## 🚀 Quick Start by Platform

### Windows (Microsoft Store) - Recommended for Beginners

**Cost**: $19 (individual) or $99 (company) - one-time  
**Time**: 1-2 days for approval  
**Complexity**: ⭐⭐ (Easy)

```bash
# 1. Create Microsoft Partner Center account
# Visit: https://partner.microsoft.com/dashboard

# 2. Build for Microsoft Store
npm run build:store

# 3. Upload the .appx file from release/ directory
# 4. Submit for certification
```

**Pros**: 
- ✅ Automatic updates through Microsoft Store
- ✅ Trusted by Windows users
- ✅ No separate code signing certificate needed
- ✅ One-time low cost

**Cons**:
- ❌ Only available on Windows Store
- ❌ Microsoft takes 15% commission on paid apps (N/A for free apps)

---

### Linux (Snap Store) - Recommended for Linux

**Cost**: Free  
**Time**: Instant  
**Complexity**: ⭐ (Very Easy)

```bash
# 1. Create Ubuntu SSO account
# Visit: https://snapcraft.io/

# 2. Install snapcraft
sudo snap install snapcraft --classic

# 3. Build snap
cd /home/codesapienbe/Projects/yabgo-browser
snapcraft

# 4. Login and upload
snapcraft login
snapcraft upload --release=stable yabgo-browser_1.1.1_amd64.snap
```

**Pros**:
- ✅ Completely free
- ✅ Automatic signing by Snapcraft
- ✅ Automatic updates
- ✅ Works on all major Linux distros
- ✅ Large user base (Ubuntu, Debian, Fedora, etc.)

**Cons**:
- ❌ Some users prefer native packages (deb/rpm)

---

### Linux (Flathub) - Alternative Linux Distribution

**Cost**: Free  
**Time**: 1-2 weeks for review  
**Complexity**: ⭐⭐⭐ (Medium)

```bash
# 1. Fork https://github.com/flathub/flathub
# 2. Add com.yabgo.Browser.yml manifest (already created)
# 3. Submit pull request
# 4. Wait for review
```

**Pros**:
- ✅ Free
- ✅ Automatic signing
- ✅ Sandboxed apps
- ✅ Growing user base

**Cons**:
- ❌ Longer review process
- ❌ Requires maintaining Flatpak manifest

---

### AppImage Signing (Self-Distribution)

**Cost**: Free  
**Time**: 5 minutes  
**Complexity**: ⭐⭐ (Easy)

```bash
# 1. Generate GPG key (one-time)
gpg --full-generate-key

# 2. Build AppImage
npm run build

# 3. Sign AppImage
npm run build:sign

# 4. Distribute both files:
#    - YABGO Browser-1.1.1.AppImage
#    - YABGO Browser-1.1.1.AppImage.sig
```

**Pros**:
- ✅ Completely free
- ✅ No gatekeepers
- ✅ Works on all Linux distros
- ✅ No internet required for users

**Cons**:
- ❌ Users must manually verify signature
- ❌ No automatic updates
- ❌ You handle distribution

---

### Windows (Standard Distribution) - For Advanced Users

**Cost**: $200-400/year for certificate  
**Time**: 3-5 business days to get certificate  
**Complexity**: ⭐⭐⭐⭐ (Hard)

```bash
# 1. Purchase code signing certificate
# Providers: DigiCert, Sectigo, SSL.com, GlobalSign

# 2. Set environment variables
export WIN_CSC_LINK="/path/to/certificate.pfx"
export WIN_CSC_KEY_PASSWORD="your_password"

# 3. Build signed installer
npm run build

# 4. Verify signature (on Windows)
# signtool verify /pa "YABGO Browser Setup 1.1.1.exe"
```

**Pros**:
- ✅ Distribute anywhere (not just Microsoft Store)
- ✅ No commission fees
- ✅ Full control

**Cons**:
- ❌ Expensive ($200-400/year)
- ❌ Complex setup
- ❌ Must renew annually

---

## 📊 Cost Comparison

| Platform | Setup Cost | Annual Cost | Total (Year 1) |
|----------|-----------|-------------|----------------|
| **Snap Store** | $0 | $0 | **$0** ⭐ |
| **Flathub** | $0 | $0 | **$0** ⭐ |
| **AppImage** | $0 | $0 | **$0** ⭐ |
| **Microsoft Store** | $19-99 | $0 | **$19-99** ⭐⭐ |
| **Windows Code Signing** | $200-400 | $200-400 | **$400-800** |
| **macOS** | $99 | $99 | **$198** |

---

## 🎯 Recommended Strategy

### For Most Users (Budget-Friendly)

1. **Linux**: Use **Snap Store** (free, easy, automatic signing)
2. **Windows**: Use **Microsoft Store** ($19-99 one-time, automatic signing)
3. **macOS**: Wait until you have budget ($99/year)

**Total First Year Cost**: $19-99

### For Open Source Projects

1. **Linux**: Use **Snap Store** + **Flathub** (both free)
2. **Windows**: Self-distribution with AppImage-style approach
3. Distribute unsigned binaries with checksums

**Total Cost**: $0

### For Commercial Products

1. Get all certificates and publish everywhere
2. Windows: Code Signing Certificate ($300/year)
3. macOS: Apple Developer ($99/year)
4. Linux: Snap + Flathub (free)

**Total First Year Cost**: $400-500

---

## 🔥 Easiest Path to Get Started TODAY

### Option 1: Linux Only (5 minutes)

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Build and upload
cd /home/codesapienbe/Projects/yabgo-browser
snapcraft
snapcraft login
snapcraft upload --release=stable yabgo-browser_1.1.1_amd64.snap
```

**Done!** Your app is now on Snap Store with automatic signing.

### Option 2: Sign AppImage (5 minutes)

```bash
# Generate GPG key
gpg --full-generate-key

# Build and sign
npm run build
npm run build:sign
```

**Done!** You now have a signed AppImage ready to distribute.

---

## 📝 Step-by-Step Guides

Detailed guides for each platform are in:
- [CODE_SIGNING_GUIDE.md](docs/CODE_SIGNING_GUIDE.md) - Complete guide for all platforms

---

## 🆘 Need Help?

### Common Issues

**Q: "I don't have $200 for a Windows certificate"**  
A: Use Microsoft Store instead ($19) or distribute unsigned with checksum

**Q: "Snap build is failing"**  
A: Make sure you have `multipass` installed: `sudo snap install multipass`

**Q: "GPG key generation is asking too many questions"**  
A: Accept all defaults except:
- Real name: Codesapien Network
- Email: yilmaz@codesapien.net

**Q: "Which platform should I start with?"**  
A: Snap Store (Linux) - it's free, easy, and has automatic signing

---

## 📞 Support

- **Documentation**: [CODE_SIGNING_GUIDE.md](docs/CODE_SIGNING_GUIDE.md)
- **Issues**: https://github.com/codesapienbe/yabgo-browser/issues
- **Email**: yilmaz@codesapien.net

---

## ✅ Next Steps

1. **Choose your platform** from the recommendations above
2. **Follow the quick start** for that platform
3. **Read the detailed guide** if you need more information
4. **Submit your app** and wait for approval

**Good luck with your app store submissions! 🚀**

