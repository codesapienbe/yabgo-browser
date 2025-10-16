# YABGO Browser

YABGO Browser is a gesture-driven, AI-powered web browser built with Electron and TypeScript.

## Changelog

All notable changes to YABGO Browser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### [Unreleased]

#### Added
- Initial release of YABGO Browser
- Gesture-driven navigation system
- AI-powered browsing assistant
- Unified URL/search input system
- Floating UI that adapts to scrolling
- SQLite-based history management
- Cross-platform Electron application
- TypeScript object-oriented architecture
- Comprehensive test suite
- Modern CSS with smooth animations

#### Features
- Corner swipe gestures for navigation
- Natural language assistant queries
- Smart URL vs search detection
- Real-time page metadata tracking
- Distraction-free browsing interface
- Dark theme optimized for extended use
- Cross-platform compatibility (Windows, macOS, Linux)

### [1.0.0] - 2024-12-XX

#### Added
- Initial stable release
- Complete feature set as described above
- Production-ready build system
- Comprehensive documentation
- Distribution packages for all platforms

#### Security
- Electron security best practices implemented
- Context isolation enabled
- Secure IPC communication
- Sandboxed webview for browsing

## 🛠️ Development Guide

### Architecture Overview

YABGO Browser follows a clean, object-oriented architecture with clear separation between main and renderer processes.

#### Main Process Architecture

```
YabgoApp (main.ts)
├── WindowManager     # Window lifecycle and configuration
├── DatabaseManager   # SQLite operations and data persistence  
├── IPCManager       # Inter-process communication handling
└── AssistantService # Natural language query processing
```

#### Renderer Process Architecture

```
BrowserApp (renderer.ts)
├── NavigationManager  # WebView control and URL handling
├── UIManager         # User interface state and interactions
├── GestureManager    # Touch and mouse gesture recognition
├── AssistantManager  # Assistant UI and query handling
└── HistoryManager    # Local history caching and management
```

### Key Design Patterns

#### 1. Event-Driven Architecture
All managers communicate through events, enabling loose coupling and extensibility.

```typescript
// Example: Navigation triggering UI updates
navigationManager.on(\'navigation\', (url: string) => {
    uiManager.updateAddressBar(url);
    historyManager.addToHistory(url);
});
```

#### 2. Manager Pattern
Each functional area has a dedicated manager class with clear responsibilities.

#### 3. Type Safety
Comprehensive TypeScript types ensure reliability and developer experience.

#### 4. Separation of Concerns
Main process handles system integration, renderer handles UI and user interaction.

### Development Workflow

#### 1. Setup Development Environment

```bash
# Install dependencies
npm install

# Start development with hot reload
npm run dev

# In another terminal, run tests
npm test -- --watch
```

#### 2. Code Organization

- **Create new features** in appropriate manager classes
- **Add types** to `src/shared/types/`
- **Write tests** alongside implementation
- **Update documentation** as needed

#### 3. Build Process

The build process compiles TypeScript separately for main and renderer:

```bash
# Build main process
npm run build:main

# Build renderer process  
npm run build:renderer

# Build everything
npm run build
```

### Adding New Features

#### 1. New Assistant Commands

```typescript
// In AssistantService.ts
if (this.matchesPatterns(lowerQuery, [\'new-command\', \'alias\'])) {
    return this.handleNewCommand();
}

private handleNewCommand(): AssistantResponse {
    // Implementation here
    return {
        type: \'results\',
        title: \'New Command Results\',
        items: results
    };
}
```

#### 2. New Gesture Actions

```typescript
// In GestureManager.ts
private handleGestureAction(action: string): void {
    switch (action) {
        case \'new-gesture\':
            this.emit(\'new-gesture\');
            break;
        // ... existing cases
    }
}
```

#### 3. New UI Components

```typescript
// In UIManager.ts
private setupNewComponent(): void {
    const component = document.getElementById(\'new-component\');
    component?.addEventListener(\'click\', this.handleNewAction.bind(this));
}
```

### Testing Strategy

#### Unit Tests
Test individual classes and methods in isolation.

```typescript
// Example: NavigationManager.test.ts
describe(\'NavigationManager\', () => {
    let navigationManager: NavigationManager;

    beforeEach(() => {
        navigationManager = new NavigationManager();
    });

    it(\'should process URLs correctly\', () => {
        const result = navigationManager.processInput(\'github.com\');
        expect(result).toBe(\'https://github.com\');
    });
});
```

#### Integration Tests
Test interaction between components.

#### E2E Tests
Test complete user workflows with Electron.

### Performance Considerations

#### 1. Database Optimization
- Use prepared statements for repeated queries
- Index frequently searched columns
- Limit result sets appropriately

#### 2. UI Performance
- Debounce scroll handlers
- Use CSS animations over JavaScript
- Minimize DOM manipulations

#### 3. Memory Management
- Clean up event listeners
- Close database connections
- Remove unused references

### Security Guidelines

#### 1. IPC Security
- Validate all inputs from renderer process
- Use context isolation
- Minimize exposed APIs

#### 2. WebView Security
- Enable appropriate sandbox settings
- Handle navigation requests carefully
- Validate external URLs

#### 3. Data Storage
- Use parameterized queries
- Sanitize user inputs
- Encrypt sensitive data if needed

### Debugging Tips

#### 1. Main Process Debugging
```bash
# Start with inspector
npm run dev -- --inspect

# Or with break on start
npm run dev -- --inspect-brk
```

#### 2. Renderer Process Debugging
- Use Electron DevTools (Cmd/Ctrl+Shift+I)
- Console logs appear in DevTools
- Use breakpoints in source files

#### 3. Database Debugging
```typescript
// Enable database logging
const db = new Database(dbPath, { verbose: console.log });
```

### Building and Distribution

#### Development Builds
```bash
npm run build
npm start
```

#### Production Builds
```bash
npm run package
# Creates installers in release/ directory
```

#### Platform-Specific Builds
```bash
npm run package:win    # Windows installer
npm run package:mac    # macOS DMG
npm run package:linux  # Linux AppImage
```

### Code Quality

#### ESLint Configuration
The project uses strict ESLint rules for consistency:
- TypeScript-specific rules
- No unused variables
- Prefer const over let
- Consistent formatting

#### Type Checking
All code must pass TypeScript strict mode:
- No implicit any
- Strict null checks
- No unused parameters
- Return type annotations

#### Git Workflow
- Use feature branches for new development
- Write descriptive commit messages
- Squash commits before merging
- Update changelog for releases

### Common Pitfalls

#### 1. IPC Communication
- Always handle promise rejections
- Validate data types between processes
- Don\'t pass large objects over IPC

#### 2. Electron Security
- Don\'t enable node integration in renderer
- Always use preload scripts for API exposure
- Validate all user inputs

#### 3. Database Operations
- Always use transactions for multiple operations
- Handle database errors gracefully
- Close connections properly

This development guide provides the foundation for contributing to YABGO Browser. For specific questions, refer to the codebase comments and type definitions.

## Webview Full-Height Layout Fix Guide

### Problem
The webview content was not filling the full height of the browser window (only about 20% height). Additionally, window control buttons (minimize, maximize, close) were not working.

### Root Causes

#### 1. Window Control Buttons Not Working
**Issue**: `IPCManager` was creating its own `WindowManager` instance instead of using the shared one from `main.ts`, so window control IPC calls were operating on a window manager with no actual window.

**Fix**: Modified `IPCManager` constructor to accept the existing `WindowManager` instance as a parameter, and updated `main.ts` to pass the shared instance.

#### 2. Webview Not Full Height
**Issue**: The layout was not using a complete flex system, causing the webview container to not properly fill available space.

**Fix**: Applied complete flexbox layout throughout the component hierarchy:

```css
/* html, body - establish full viewport */
html, body {
    height: 100%;
    width: 100%;
    overflow: hidden;
}

/* .app-container - flex column container */
.app-container {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
}

/* .title-bar - fixed 32px height */
.title-.bar {
    flex: 0 0 32px;
    /* Fixed height, won\'t grow or shrink */
}

/* .browser-content - grows to fill remaining space */
.browser-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    min-height: 0; /* Critical for nested flex */
    overflow: hidden;
}

/* webview - fills browser-content */
webview {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0; /* Allows shrinking in flex container */
    display: block;
}
```

### Key CSS Concepts Applied

#### The `min-height: 0` Fix
By default, flex items have `min-height: auto`, which prevents them from shrinking below their content size. Setting `min-height: 0` on both `.browser-content` and `webview` allows proper flex behavior.

#### Flex Value Breakdown
- `flex: 1 1 auto` = `flex-grow: 1` (expand to fill space) + `flex-shrink: 1` (can shrink) + `flex-basis: auto` (start from content size)
- `flex: 0 0 32px` = `flex-grow: 0` (don\'t grow) + `flex-shrink: 0` (don\'t shrink) + `flex-basis: 32px` (fixed 32px)

### How to Verify the Fix

#### Method 1: Run with DevTools (Automatic)
```bash
npm run prod
```

DevTools will open automatically. In the DevTools:

1. **Inspect the elements**:
   - Right-click on the webview area → \"Inspect Element\"
   - Check the computed dimensions in the Styles panel

2. **Expected dimensions** (for 1400x900 window):
   - `.app-container`: 1400px × 900px
   - `.title-bar`: 1400px × 32px
   - `.browser-content`: 1400px × 868px (900 - 32)
   - `webview`: 1400px × 868px

3. **Check flex properties**:
   - `.browser-content` should show `flex: 1 1 auto`
   - `webview` should show `flex: 1 1 auto`

#### Method 2: Console Inspection
Open DevTools Console and run:

```javascript
const browserContent = document.querySelector(\'.browser-content\');
const webview = document.querySelector(\'webview\');

console.log(\'Browser content:\', {
    width: browserContent.offsetWidth,
    height: browserContent.offsetHeight,
    flex: window.getComputedStyle(browserContent).flex
});

console.log(\'Webview:\', {
    width: webview.offsetWidth,
    height: webview.offsetHeight,
    flex: window.getComputedStyle(webview).flex
});
```

#### Method 3: Visual Inspection
1. Run the app
2. The webview should fill the entire window from below the title bar to the bottom
3. Test window controls:
   - Click minimize button (−) → window should minimize
   - Click maximize button (□) → window should maximize/restore
   - Click close button (×) → window should close

### Files Changed

#### Main Process
- `src/main/main.ts` - Pass WindowManager instance to IPCManager
- `src/main/managers/IPCManager.ts` - Accept WindowManager in constructor
- `src/main/managers/WindowManager.ts` - Enable DevTools for debugging

#### Renderer Process
- `src/renderer/styles.css` - Complete flex layout system
- `src/renderer/managers/NavigationManager.ts` - Added dimension logging (debug)

### Testing
Run the test suite to verify layout constraints:

```bash
npm test -- WebviewLayout.test.ts
```

Expected: 8 tests passing, verifying:
- ✓ Browser content absolutely positioned to fill space below title bar
- ✓ Webview absolutely positioned to fill container
- ✓ App container uses absolute positioning layout
- ✓ Title bar positioned at top with fixed height
- ✓ Browser content has overflow hidden
- ✓ Input container absolutely positioned
- ✓ Webview fills entire browser-content area
- ✓ Layout ensures webview gets full viewport height minus title bar

### Common Issues & Solutions

#### Issue: Webview still short
**Solution**: Check that overlays (input-container, assistant-response) are `position: absolute` and not affecting flex layout.

#### Issue: Webview has wrong height in DevTools
**Solution**: Ensure `min-height: 0` is set on both `.browser-content` and `webview`.

#### Issue: Window controls still not working
**Solution**: Verify that preload.js is being loaded correctly and `window.yabgo` API is exposed. Check DevTools Console for errors.

#### Issue: Flex not working
**Solution**: Ensure the entire hierarchy is using flex:
\`\`\`
html/body (height: 100%)
  → .app-container (flex column, height: 100vh)
    → .title-bar (flex: 0 0 32px)
    → .browser-content (flex: 1 1 auto, display: flex)
      → webview (flex: 1 1 auto)
\`\`\`

### Electron Webview Quirks

#### Absolute Positioning on Webview
❌ **Don\'t do this:**
```css
webview {
    position: absolute;
    top: 0; bottom: 0;
    left: 0; right: 0;
}
```

✅ **Do this instead:**
```css
webview {
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
}
```

Electron\'s `<webview>` tag doesn\'t render properly with absolute positioning applied directly to it. Instead, use flex layout.

### Build & Run Commands

```bash
# Development mode (auto-rebuild)
npm run dev

# Production mode (one-time build)
npm run prod

# Build only
npm run clean && tsc -p tsconfig.main.json && webpack --mode production && npm run copy:assets

# Run built app
electron .
```

### Debugging Tips

1. **Enable verbose logging**: Check console for dimension logs from NavigationManager
2. **Inspect element hierarchy**: Verify the DOM structure matches the flex layout
3. **Check computed styles**: Use DevTools to see actual CSS values applied
4. **Test window resize**: Webview should scale with window
5. **Check z-index stacking**: Ensure overlays don\'t block the webview

### Success Criteria

✅ Webview fills entire height from below title bar (32px) to bottom of window
✅ Webview scales correctly when window is resized
✅ Minimize button works
✅ Maximize button works
✅ Close button works
✅ Input container overlays webview without affecting its height
✅ All tests pass

---

**Last Updated**: October 16, 2025
**Status**: Fixed and verified with complete flex layout system
