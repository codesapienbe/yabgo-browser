# 🌍 YABGO Browser

Welcome to **YABGO** — *Yet Another Browser to Go and Visit*. 

A **lightning-fast, gesture-driven web browser** built for the modern user. Experience browsing like never before with natural touch gestures, an AI-powered assistant, and a beautifully minimal interface.

---

## ✨ Why Choose YABGO?

### 🎯 Gesture-Powered Navigation
Navigate with **intuitive corner swipes** instead of clicking buttons:
- **Swipe from left edge** → Go back
- **Swipe from right edge** → Go forward  
- **Swipe from corners** → Smart navigation

No more reaching for the back button. Just swipe, and keep browsing.

### 🤖 AI-Powered Assistant
Have a conversation with your browser:
- Ask questions naturally (e.g., "What's the weather?", "Show me news")
- Get instant results without leaving the page
- Smart context awareness for better responses

Simply type your question and let the AI handle the rest.

### 🌙 Distraction-Free Interface
- **Dark theme** optimized for comfortable extended browsing
- **Floating, adaptive UI** that gets out of your way while you scroll
- **Clean address bar** that doubles as a search input
- Minimal design, maximum focus

### ⚡ Lightning Fast
- Native desktop performance
- Instant tab management
- Smooth animations and transitions
- Optimized for speed, built for efficiency

### 🔒 Secure & Private
- Built with Electron's security best practices
- Context isolation enabled
- No data collection or tracking
- Your browsing, your data

### 🖥️ Cross-Platform
Available for:
- **Windows** (7+)
- **macOS** (10.13+)
- **Linux** (Ubuntu, Fedora, etc.)

Same beautiful experience everywhere.

---

## 🛡️ Privacy & Ad-Free Guarantee

We believe in **radical privacy**. YABGO is engineered from the ground up to be completely ad-free and privacy-respecting.

### ✅ What We Don't Do
- ❌ **No Ads** — Zero advertising networks, no Google Ads, no sponsored content
- ❌ **No Tracking** — No Google Analytics, no Facebook Pixel, no telemetry
- ❌ **No Data Collection** — We don't collect, sell, or share your browsing data
- ❌ **No Third-Party Scripts** — No external services monitoring your activity
- ❌ **No Profiling** — Your interests and behaviors are not analyzed or sold

### ✅ What We Do Instead
- ✅ **Local-First Architecture** — All browsing history stored locally on your device
- ✅ **Encrypted Partitions** — Each tab runs in an isolated, sandboxed environment
- ✅ **Enterprise Security** — Context isolation, strict content security policies
- ✅ **Open Source** — Audit the code yourself, no hidden surprises
- ✅ **Transparent** — MIT Licensed, community-driven development

### 🔐 Technical Security Details
- **Chromium Security** — Built on Chromium, inheriting 10+ years of security hardening
- **Electron Best Practices** — Context isolation prevents code injection
- **Node Integration Disabled** — Renderer process cannot access system resources
- **Sandbox Mode Active** — WebViews run in restricted environments
- **Secure Web Preferences** — HTTPS enforced, insecure content blocked
- **Isolated Tab Partitions** — Each tab has separate storage (`persist:yabgo:tabid`)

### 💡 Why Privacy Matters
In 2025, your data is often worth more than the software itself. We've chosen a different path: sustainable, open-source development without exploiting your privacy. Browse with complete peace of mind knowing:
- Your searches stay on your computer
- Your history is yours alone
- Your choices aren't being tracked or monetized
- Your digital life remains private

---

## 🚀 Getting Started

### Installation

#### **Windows**
1. Download `YABGO-Browser-Setup.exe` from [Releases](https://github.com/codesapienbe/yabgo-browser/releases)
2. Run the installer
3. Launch YABGO Browser from your Start Menu

#### **macOS**
1. Download `YABGO-Browser.dmg` from [Releases](https://github.com/codesapienbe/yabgo-browser/releases)
2. Open the DMG file
3. Drag YABGO to Applications
4. Launch from Applications folder

#### **Linux**
1. Download `YABGO-Browser.AppImage` from [Releases](https://github.com/codesapienbe/yabgo-browser/releases)
2. Make it executable: `chmod +x YABGO-Browser.AppImage`
3. Run: `./YABGO-Browser.AppImage`

---

## 🎮 How to Use YABGO

### Basic Navigation

**Address Bar**
- Click the address bar at the top
- Type a URL or search term
- Press **Enter** to navigate

**Back & Forward**
- **Swipe from the left edge** to go back
- **Swipe from the right edge** to go forward
- Or use keyboard: **Alt+Left** (back) / **Alt+Right** (forward)

**New Tab**
- Press **Ctrl+T** (Windows/Linux) or **Cmd+T** (macOS)
- Click the + button if visible

### Using the AI Assistant

**Ask a Question**
1. Focus the address bar
2. Type your question (e.g., "weather", "bitcoin price", "today's news")
3. The assistant responds with relevant information

**Examples**
- "What time is it?"
- "Convert 100 USD to EUR"
- "Tell me about Mars"
- "Show me trending tech news"

### Gesture Controls

**Swipe Navigation**
- Swipe from the **left side** of the screen → Back
- Swipe from the **right side** of the screen → Forward
- Smooth, intuitive, instant

**Keyboard Shortcuts**
| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Back | Alt + ← | Cmd + ← |
| Forward | Alt + → | Cmd + → |
| Reload | Ctrl + R | Cmd + R |
| New Tab | Ctrl + T | Cmd + T |
| Close Tab | Ctrl + W | Cmd + W |
| Settings | Ctrl + , | Cmd + , |

---

## 🎨 Customization

### Dark Theme
YABGO comes with an optimized dark theme that reduces eye strain and looks beautiful. More themes coming soon!

### Floating UI
The interface adapts as you scroll:
- Address bar floats for easy access
- Assistant panel slides in smoothly
- Nothing blocks your content

---

## ❓ FAQ

**Q: Is YABGO free?**  
A: Yes! YABGO is completely free and open-source.

**Q: How is my data protected?**  
A: YABGO doesn't track you. Your browsing history is stored locally on your computer, nowhere else. We follow Electron's security best practices.

**Q: Can I use YABGO without internet?**  
A: Most features require internet (for web browsing), but the assistant and local history work offline.

**Q: What websites can I visit?**  
A: Any website! YABGO is built on Chromium, so it supports all modern web standards and every website out there.

**Q: How do I report a bug?**  
A: Found an issue? Please report it on [GitHub Issues](https://github.com/yabgo/yabgo-browser/issues). We read every report!

**Q: Can I contribute to YABGO?**  
A: Absolutely! YABGO is open-source. See the [Development Guide](#-development-guide) below for details.

---

## 📚 Troubleshooting

### YABGO won't start
- Try restarting your computer
- Reinstall the application
- Check your system meets minimum requirements

### Gestures not working
- Make sure you're swiping from the very edge of the window
- Try using keyboard shortcuts instead
- Restart the app

### AI Assistant not responding
- Check your internet connection
- Try rephrasing your question more simply
- Refresh the page

### Blank screen/crashes
- Update to the latest version
- Reinstall the application
- Check your system storage (need at least 500MB free)

---

## 🆘 Support

**Have Questions?**
- 📖 [Documentation](https://github.com/yabgo/yabgo-browser/wiki)
- 🐛 [Report Issues](https://github.com/yabgo/yabgo-browser/issues)
- 💬 [Discussions](https://github.com/yabgo/yabgo-browser/discussions)

---

## 📝 What's New

### Version 1.0.0 (Latest)
- ✨ Gesture-driven navigation system
- 🤖 AI-powered browsing assistant
- 🌙 Beautiful dark theme
- ⚡ Lightning-fast performance
- 🔒 Enterprise-grade security
- 🖥️ Cross-platform support

[See Full Changelog](CHANGELOG.md)

---

## 📜 License

YABGO Browser is open-source software licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🛠️ Development Guide

*This section is for developers who want to contribute or build from source.*

### Architecture Overview

YABGO follows a clean, object-oriented architecture:

**Main Process** (System integration)
- `WindowManager` — Window lifecycle and configuration
- `DatabaseManager` — SQLite operations and history
- `IPCManager` — Inter-process communication
- `AssistantService` — Natural language processing

**Renderer Process** (User interface)
- `NavigationManager` — WebView control and URLs
- `UIManager` — User interface state
- `GestureManager` — Touch and mouse gestures
- `AssistantManager` — Assistant UI
- `HistoryManager` — Local history caching

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yabgo/yabgo-browser.git
cd yabgo-browser

# Install dependencies
npm install

# Start development with hot reload
npm run dev

# In another terminal, run tests
npm test -- --watch
```

### Build Process

```bash
# Build for your platform
npm run build

# Build for Windows
npm run build:win

# Build for all platforms
npm run build:all

# Run production build
npm run prod
```

### Key Design Patterns

#### 1. Event-Driven Architecture
Managers communicate through events for loose coupling:
```typescript
navigationManager.on('navigation', (url: string) => {
    uiManager.updateAddressBar(url);
    historyManager.addToHistory(url);
});
```

#### 2. Manager Pattern
Each functional area has a dedicated manager with clear responsibilities.

#### 3. Type Safety
Comprehensive TypeScript types ensure reliability and great developer experience.

### Adding Features

#### New Assistant Commands
```typescript
// In AssistantService.ts
if (this.matchesPatterns(lowerQuery, ['command-name'])) {
    return this.handleCommand();
}
```

#### New Gestures
```typescript
// In GestureManager.ts
private handleGestureAction(action: string): void {
    switch (action) {
        case 'new-gesture':
            this.emit('new-gesture');
            break;
    }
}
```

#### New UI Components
```typescript
// In UIManager.ts
private setupNewComponent(): void {
    const component = document.getElementById('component-id');
    component?.addEventListener('click', this.handleAction.bind(this));
}
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Specific test file
npm test -- WebviewLayout.test.ts
```

### Code Quality

- **TypeScript strict mode** — No implicit any, strict null checks
- **ESLint** — Consistent code style
- **Git workflow** — Feature branches, descriptive commits
- **Type annotations** — All functions must have return types

### Security Guidelines

1. **IPC Communication** — Validate all inputs from renderer
2. **WebView Security** — Enable appropriate sandbox settings
3. **Data Storage** — Use parameterized queries, sanitize inputs

### Debug Commands

```bash
# Start with debugger
npm run dev -- --inspect

# Enable database logging
const db = new Database(dbPath, { verbose: console.log });
```

### Common Pitfalls

- ❌ Don't pass large objects over IPC
- ❌ Don't enable node integration in renderer
- ❌ Don't forget to close database connections
- ✅ Always validate data between processes
- ✅ Use context isolation for security
- ✅ Handle promise rejections

---

## 🤝 Contributing

We'd love your help! Here's how to contribute:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Every contribution helps make YABGO better! 🎉

---

**Last Updated**: October 2025  
**Built with** ❤️ **by the YABGO Team**
