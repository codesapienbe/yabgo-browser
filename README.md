# 🚀 YABGO Browser

**Yet Another Browser to Go and Visit**

A modern, minimal Electron-based browser with gesture navigation and AI assistant, built with TypeScript and object-oriented architecture.

## ✨ Features

### 🌐 Core Browser Features
- **Chromium-based rendering** - Full compatibility with all websites
- **Unified input system** - Smart URL/search detection
- **Real-time page tracking** - SQLite-based history with metadata
- **Cross-platform support** - Windows, macOS, and Linux

### 👆 Gesture Navigation
- **Corner swipe gestures** for intuitive navigation
- **Left → Right**: Browser back
- **Right → Left**: Browser forward  
- **Top → Down**: Refresh page
- **Bottom → Up**: Scroll to top
- **Visual feedback** for all gesture actions

### 🤖 AI Assistant
- **Natural language queries** for history search
- **Smart commands**: "find rust", "recent pages", "most visited"
- **Statistics and insights** about browsing patterns
- **Instant results** with clickable navigation

### 🎨 Modern Interface
- **Floating UI** that adapts to scrolling behavior
- **Minimal design** focused on content consumption
- **Dark theme** optimized for extended use
- **Smooth animations** with 60fps performance
- **Distraction-free browsing** experience

## 🏗️ Architecture

### Object-Oriented Design
```
src/
├── main/                    # Electron main process
│   ├── main.ts             # Application entry point
│   ├── managers/           # Core system managers
│   │   ├── WindowManager.ts
│   │   ├── DatabaseManager.ts
│   │   └── IPCManager.ts
│   ├── services/           # Business logic services
│   │   └── AssistantService.ts
│   └── preload.ts          # Secure IPC bridge
├── renderer/               # Browser UI (renderer process)
│   ├── renderer.ts         # UI entry point
│   ├── core/               # Application core
│   │   └── BrowserApp.ts
│   ├── managers/           # UI component managers
│   │   ├── NavigationManager.ts
│   │   ├── UIManager.ts
│   │   ├── GestureManager.ts
│   │   ├── AssistantManager.ts
│   │   └── HistoryManager.ts
│   ├── utils/              # Utility classes
│   │   └── EventEmitter.ts
│   ├── index.html          # Main UI template
│   └── styles.css          # Modern CSS styling
└── shared/                 # Shared types and utilities
    ├── types/              # TypeScript type definitions
    │   ├── DataTypes.ts
    │   └── WindowTypes.ts
    └── utils/              # Shared utility classes
        ├── Logger.ts
        └── URLHelper.ts
```

### Technology Stack
- **Electron 28** - Desktop app framework
- **TypeScript 5.2** - Type-safe development
- **Better-SQLite3** - Fast local database
- **Modern CSS** - Flexbox, Grid, animations
- **ESLint + Jest** - Code quality and testing

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/))
- **npm 9+** (included with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Installation

1. **Clone or extract** the YABGO project:
```bash
cd yabgo-browser
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development**:
```bash
npm run dev
```

4. **Build for production**:
```bash
npm run build
npm start
```

### Building Distributables

```bash
# Build for your current platform
npm run package

# Build for specific platforms
npm run package:win     # Windows (.exe installer)
npm run package:mac     # macOS (.dmg)
npm run package:linux   # Linux (AppImage)
```

## 📖 Usage Guide

### Navigation
- **URL Entry**: Type domains like `github.com` or full URLs
- **Search Queries**: Type searches like `rust programming`
- **Gesture Controls**: Use corner swipes for navigation
- **Keyboard Shortcuts**: `Enter` to navigate, `Escape` to close assistant

### AI Assistant Commands
```
find rust programming    # Search for pages about Rust
recent pages            # Show recently visited pages
most visited           # Display most frequently visited
clear history          # Clear all browsing history
stats                  # Show browsing statistics
```

### Floating UI Behavior
- Input bar becomes **floating button** when scrolling down
- **Click floating button** to expand input again
- **Auto-hides** during content consumption
- **Smooth transitions** between states

## 🛠️ Development

### Development Commands
```bash
npm run dev              # Start with hot reload
npm run build           # Build TypeScript
npm run build:watch     # Build with file watching
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint issues
npm run test            # Run Jest tests
npm run clean           # Clean build directory
```

### Project Structure
- **Main process** (`src/main/`): System-level functionality
- **Renderer process** (`src/renderer/`): Browser UI and interactions
- **Shared code** (`src/shared/`): Common types and utilities
- **Build output** (`dist/`): Compiled JavaScript
- **Release builds** (`release/`): Packaged applications

### Code Style
- **TypeScript strict mode** enabled
- **ESLint** with TypeScript rules
- **Object-oriented patterns** throughout
- **Event-driven architecture** for component communication
- **Comprehensive logging** with contextual loggers

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=development     # Enable development features
LOG_LEVEL=debug         # Set logging level (debug, info, warn, error)
```

### Build Configuration
- **TypeScript configs**: `tsconfig.json`, `tsconfig.main.json`, `tsconfig.renderer.json`
- **Electron Builder**: Configured in `package.json` build section
- **ESLint**: `.eslintrc.json` with TypeScript support
- **Jest**: `jest.config.json` for testing setup

## 📝 API Reference

### Main Process APIs

#### DatabaseManager
```typescript
class DatabaseManager {
    insertOrUpdateMetadata(metadata: PageMetadata): void
    searchPages(query: string, options?: HistorySearchOptions): PageMetadata[]
    getRecentPages(limit?: number): PageMetadata[]
    getMostVisitedPages(limit?: number): PageMetadata[]
    clearHistory(): void
}
```

#### AssistantService  
```typescript
class AssistantService {
    processQuery(query: string): Promise<AssistantResponse>
}
```

### Renderer Process APIs

#### NavigationManager
```typescript
class NavigationManager extends EventEmitter {
    navigate(input: string): void
    goBack(): boolean
    goForward(): boolean
    refresh(): void
    scrollToTop(): void
}
```

#### GestureManager
```typescript
class GestureManager extends EventEmitter {
    enableGestures(): void
    disableGestures(): void
}
```

### IPC Communication
```typescript
// Available in renderer process via window.yabgo
interface YabgoAPI {
    savePageMetadata(metadata: PageMetadata): Promise<{success: boolean}>
    assistantQuery(query: string): Promise<AssistantResponse>
    getHistory(limit?: number): Promise<PageMetadata[]>
    minimizeWindow(): Promise<void>
    maximizeWindow(): Promise<void>
    closeWindow(): Promise<void>
}
```

## 🧪 Testing

### Running Tests
```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # With coverage report
```

### Test Structure
- **Unit tests**: `src/**/*.test.ts`
- **Integration tests**: `tests/integration/`
- **E2E tests**: `tests/e2e/`

## 🔒 Security

### Security Features
- **Context isolation** enabled in webview
- **Node integration** disabled in renderer
- **Content Security Policy** headers
- **Secure defaults** for all Electron settings
- **SQLite prepared statements** to prevent injection

### Privacy
- **Local-only data storage** (no cloud sync)
- **No telemetry or tracking**
- **User-controlled history** and data retention
- **Sandboxed webview** for browsing security

## 🐛 Troubleshooting

### Common Issues

**Build fails with TypeScript errors:**
```bash
npm run clean
npm install
npm run build
```

**Electron app won't start:**
```bash
# Check if build completed successfully
ls -la dist/
# Rebuild dependencies
npm run postinstall
```

**Gestures not working:**
- Ensure you're swiping from the corner areas
- Try adjusting gesture threshold in settings
- Check gesture zones are not blocked by other elements

**Database errors:**
- Delete `~/Library/Application Support/yabgo-browser/` (macOS)
- Delete `%APPDATA%/yabgo-browser/` (Windows)
- Delete `~/.config/yabgo-browser/` (Linux)

### Performance Optimization
- **Disable unnecessary features** in development
- **Use production builds** for better performance
- **Clear history periodically** for faster searches
- **Close unused tabs** in webview

## 📄 License

**MIT License** - See [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Development Guidelines
- **Follow TypeScript best practices**
- **Write tests** for new features
- **Update documentation** as needed
- **Use conventional commits**
- **Ensure ESLint passes**

## 🚀 Roadmap

### Planned Features
- [ ] **Tab system** with gesture switching
- [ ] **Bookmark management** with sync
- [ ] **Extension system** for customization  
- [ ] **Theme customization** (light/dark/auto)
- [ ] **Voice commands** for assistant
- [ ] **Advanced gestures** (multi-touch, pressure)
- [ ] **Performance monitoring** and optimization
- [ ] **Privacy mode** with temporary sessions

### Future Enhancements
- [ ] **Cloud sync** (optional, user-controlled)
- [ ] **Mobile companion** app
- [ ] **Advanced AI features** with local LLM
- [ ] **Workspace management**
- [ ] **Developer tools** integration

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yabgo/yabgo-browser/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yabgo/yabgo-browser/discussions)
- **Documentation**: [Wiki](https://github.com/yabgo/yabgo-browser/wiki)
- **Email**: contact@yabgo.com

---

**Built with ❤️ by the YABGO Team**

*A modern browser for the gesture-driven future.*