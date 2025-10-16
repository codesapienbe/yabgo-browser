# 🛠️ Development Guide

## Architecture Overview

YABGO Browser follows a clean, object-oriented architecture with clear separation between main and renderer processes.

### Main Process Architecture

```
YabgoApp (main.ts)
├── WindowManager     # Window lifecycle and configuration
├── DatabaseManager   # SQLite operations and data persistence  
├── IPCManager       # Inter-process communication handling
└── AssistantService # Natural language query processing
```

### Renderer Process Architecture

```
BrowserApp (renderer.ts)
├── NavigationManager  # WebView control and URL handling
├── UIManager         # User interface state and interactions
├── GestureManager    # Touch and mouse gesture recognition
├── AssistantManager  # Assistant UI and query handling
└── HistoryManager    # Local history caching and management
```

## Key Design Patterns

### 1. Event-Driven Architecture
All managers communicate through events, enabling loose coupling and extensibility.

```typescript
// Example: Navigation triggering UI updates
navigationManager.on('navigation', (url: string) => {
    uiManager.updateAddressBar(url);
    historyManager.addToHistory(url);
});
```

### 2. Manager Pattern
Each functional area has a dedicated manager class with clear responsibilities.

### 3. Type Safety
Comprehensive TypeScript types ensure reliability and developer experience.

### 4. Separation of Concerns
Main process handles system integration, renderer handles UI and user interaction.

## Development Workflow

### 1. Setup Development Environment

```bash
# Install dependencies
npm install

# Start development with hot reload
npm run dev

# In another terminal, run tests
npm test -- --watch
```

### 2. Code Organization

- **Create new features** in appropriate manager classes
- **Add types** to `src/shared/types/`
- **Write tests** alongside implementation
- **Update documentation** as needed

### 3. Build Process

The build process compiles TypeScript separately for main and renderer:

```bash
# Build main process
npm run build:main

# Build renderer process  
npm run build:renderer

# Build everything
npm run build
```

## Adding New Features

### 1. New Assistant Commands

```typescript
// In AssistantService.ts
if (this.matchesPatterns(lowerQuery, ['new-command', 'alias'])) {
    return this.handleNewCommand();
}

private handleNewCommand(): AssistantResponse {
    // Implementation here
    return {
        type: 'results',
        title: 'New Command Results',
        items: results
    };
}
```

### 2. New Gesture Actions

```typescript
// In GestureManager.ts
private handleGestureAction(action: string): void {
    switch (action) {
        case 'new-gesture':
            this.emit('new-gesture');
            break;
        // ... existing cases
    }
}
```

### 3. New UI Components

```typescript
// In UIManager.ts
private setupNewComponent(): void {
    const component = document.getElementById('new-component');
    component?.addEventListener('click', this.handleNewAction.bind(this));
}
```

## Testing Strategy

### Unit Tests
Test individual classes and methods in isolation.

```typescript
// Example: NavigationManager.test.ts
describe('NavigationManager', () => {
    let navigationManager: NavigationManager;

    beforeEach(() => {
        navigationManager = new NavigationManager();
    });

    it('should process URLs correctly', () => {
        const result = navigationManager.processInput('github.com');
        expect(result).toBe('https://github.com');
    });
});
```

### Integration Tests
Test interaction between components.

### E2E Tests
Test complete user workflows with Electron.

## Performance Considerations

### 1. Database Optimization
- Use prepared statements for repeated queries
- Index frequently searched columns
- Limit result sets appropriately

### 2. UI Performance
- Debounce scroll handlers
- Use CSS animations over JavaScript
- Minimize DOM manipulations

### 3. Memory Management
- Clean up event listeners
- Close database connections
- Remove unused references

## Security Guidelines

### 1. IPC Security
- Validate all inputs from renderer process
- Use context isolation
- Minimize exposed APIs

### 2. WebView Security
- Enable appropriate sandbox settings
- Handle navigation requests carefully
- Validate external URLs

### 3. Data Storage
- Use parameterized queries
- Sanitize user inputs
- Encrypt sensitive data if needed

## Debugging Tips

### 1. Main Process Debugging
```bash
# Start with inspector
npm run dev -- --inspect

# Or with break on start
npm run dev -- --inspect-brk
```

### 2. Renderer Process Debugging
- Use Electron DevTools (Cmd/Ctrl+Shift+I)
- Console logs appear in DevTools
- Use breakpoints in source files

### 3. Database Debugging
```typescript
// Enable database logging
const db = new Database(dbPath, { verbose: console.log });
```

## Building and Distribution

### Development Builds
```bash
npm run build
npm start
```

### Production Builds
```bash
npm run package
# Creates installers in release/ directory
```

### Platform-Specific Builds
```bash
npm run package:win    # Windows installer
npm run package:mac    # macOS DMG
npm run package:linux  # Linux AppImage
```

## Code Quality

### ESLint Configuration
The project uses strict ESLint rules for consistency:
- TypeScript-specific rules
- No unused variables
- Prefer const over let
- Consistent formatting

### Type Checking
All code must pass TypeScript strict mode:
- No implicit any
- Strict null checks
- No unused parameters
- Return type annotations

### Git Workflow
- Use feature branches for new development
- Write descriptive commit messages
- Squash commits before merging
- Update changelog for releases

## Common Pitfalls

### 1. IPC Communication
- Always handle promise rejections
- Validate data types between processes
- Don't pass large objects over IPC

### 2. Electron Security
- Don't enable node integration in renderer
- Always use preload scripts for API exposure
- Validate all user inputs

### 3. Database Operations
- Always use transactions for multiple operations
- Handle database errors gracefully
- Close connections properly

This development guide provides the foundation for contributing to YABGO Browser. For specific questions, refer to the codebase comments and type definitions.