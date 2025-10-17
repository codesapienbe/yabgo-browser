# YABGO Browser v1.1.1 Release Notes

## Release Date
October 17, 2025

## Overview
This release introduces default MCP servers for enhanced user experience and fixes the markdown reader view functionality.

## New Features

### 🚀 Default MCP Servers
YABGO Browser now comes with 5 pre-configured MCP servers that are automatically installed on first run:

1. **Filesystem Server** - File operations (read, write, search)
2. **Memory Server** - Persistent note storage across sessions
3. **Brave Search Server** - Web search capabilities (requires API key)
4. **Git Server** - Git repository operations
5. **Time Server** - Timezone and time conversion utilities

**Details:**
- Automatically initialized on first run
- Can be enabled/disabled individually
- Permissions pre-configured for security
- No manual installation required (uses `npx -y`)

### 📚 Fixed Markdown Reader View
The reader-friendly view now properly renders markdown content as formatted HTML instead of raw text.

**Improvements:**
- Added `marked` library for markdown parsing
- Markdown content now displays with proper formatting
- Headers, lists, links, and images render correctly
- Maintains clean, readable layout

## Bug Fixes

- **Reader View**: Fixed markdown rendering issue where content was displayed as raw text instead of formatted HTML
- **Markdown Display**: Reader overlay now properly converts markdown to HTML for better readability

## Technical Changes

### Dependencies
- Added: `marked@^latest` - Markdown parser and compiler
- Added: `@types/marked@^latest` - TypeScript definitions for marked

### Code Changes
1. **src/renderer/managers/UIManager.ts**
   - Updated `showReader()` method to parse markdown using `marked.parse()`
   - Method now async to handle markdown parsing

2. **src/main/main.ts**
   - Added `initializeDefaultMCPServers()` method
   - Automatically loads default servers on first run
   - Imports default server configurations

3. **src/shared/utils/DefaultMCPServers.ts** (New)
   - Defines 5 default MCP server configurations
   - Provides utility functions for initialization
   - Handles first-run detection

4. **docs/DEFAULT_MCP_SERVERS.md** (New)
   - Comprehensive guide for default MCP servers
   - Usage examples for each server
   - Setup instructions and troubleshooting

## Upgrade Notes

### For Users
- On first launch after upgrade, 5 default MCP servers will be automatically added
- If you already have MCP servers configured, defaults won't be added
- You can manually add default servers by following the [Default MCP Servers Guide](./docs/DEFAULT_MCP_SERVERS.md)

### For Developers
- Webpack automatically bundles the `marked` library
- No additional configuration needed
- TypeScript definitions included for type safety

## Breaking Changes
None - This release is fully backward compatible

## Known Issues
- Brave Search server requires manual API key setup
- First run of MCP servers may be slow (npx downloads packages)

## Installation

### Linux (AppImage)
```bash
chmod +x "YABGO Browser-1.1.1.AppImage"
./"YABGO Browser-1.1.1.AppImage"
```

### Windows (NSIS Installer)
```
Run "YABGO Browser Setup 1.1.1.exe"
```

## Documentation

- [Default MCP Servers Guide](./docs/DEFAULT_MCP_SERVERS.md)
- [MCP Integration Guide](./docs/MCP_INTEGRATION.md)
- [Development Guide](./DEVELOPMENT.md)

## What's Next

Future releases will include:
- More default MCP servers
- Improved MCP server management UI
- Better markdown rendering with syntax highlighting
- Custom markdown themes for reader view

## Feedback

We'd love to hear from you! Report issues or suggest features:
- GitHub Issues: https://github.com/codesapienbe/yabgo-browser/issues
- Email: yilmaz@codesapien.net

---

**Full Changelog**: v1.1.0...v1.1.1

