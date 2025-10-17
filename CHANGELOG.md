# Changelog

All notable changes to YABGO Browser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2025-10-18

### Added
- 🎁 **Default MCP Servers**: 5 pre-configured MCP servers automatically added on first run
  - Filesystem Server - File operations (read, write, search)
  - Memory Server - Persistent note storage
  - Brave Search Server - Web search capabilities (requires API key)
  - Git Server - Git repository operations
  - Time Server - Timezone and time conversion
- 📚 **Default MCP Servers Documentation**: Comprehensive guide at `docs/DEFAULT_MCP_SERVERS.md`

### Fixed
- 📖 **Markdown Reader View**: Fixed rendering issue where markdown content was displayed as raw text
  - Added `marked` library for proper markdown-to-HTML conversion
  - Reader view now displays formatted content with headers, lists, links, and images
  - Improved readability with proper HTML rendering

### Added - Code Signing & Distribution
- 🔐 **Complete Code Signing Setup**: Ready for all major app stores
  - Microsoft Store (APPX) configuration
  - Snap Store manifest with automatic signing
  - Flathub manifest for Linux distribution
  - AppImage GPG signing script
  - macOS code signing entitlements
- 📦 **New Build Scripts**:
  - `npm run build:store` - Build for Microsoft Store
  - `npm run build:snap` - Build Snap package
  - `npm run build:sign` - Sign AppImage with GPG
- 📚 **Distribution Documentation**:
  - Complete code signing guide (`docs/CODE_SIGNING_GUIDE.md`)
  - Quick start guide (`SIGNING_QUICKSTART.md`)
  - Setup summary (`CODE_SIGNING_SETUP_SUMMARY.md`)
  - Publishing guide (`READY_TO_PUBLISH.md`)

### Technical
- Added `marked` npm package for markdown parsing
- Added `@types/marked` for TypeScript support
- Updated `UIManager.showReader()` to async for markdown parsing
- New `DefaultMCPServers.ts` utility for server initialization
- Enhanced `main.ts` with `initializeDefaultMCPServers()` method
- Extended `package.json` build configuration for all platforms
- Created Snap, Flatpak, and desktop integration files

## [1.1.0] - 2025-10-17

### Added
- 🔧 **MCP (Model Context Protocol) Integration**
  - Full MCP client implementation with TypeScript SDK
  - Connect to external AI tools and services
  - Execute tools with `@servername toolname params` syntax
  - Privacy-aware context sharing with granular permissions
  - Visual status indicator showing server count and activity
  - Automatic context extraction from browsing sessions
  - Database persistence for server configurations and tool history
  - Smart server suggestions with autocomplete
  - Comprehensive error handling and recovery
  - 643 lines of unit and integration tests
  - 550+ lines of user documentation

### Features
- **MCPClientManager**: Server connection, tool discovery/execution, resource listing
- **MCPContextManager**: Permission-based filtering, domain restrictions, history management
- **MCPSettingsManager**: Beautiful glassmorphic UI for server configuration
- **IPC Bridge**: 9 channels for main ↔ renderer communication
- **Assistant Integration**: Natural `@` command syntax in unified input
- **Status Indicator**: Floating indicator with green/blue/red states
- **Performance**: Debounced UI updates, connection pooling, graceful degradation
- **Security**: Per-server permissions, explicit consent model, privacy-first design

### Documentation
- Complete MCP Integration Guide (`docs/MCP_INTEGRATION.md`)
- Updated README with MCP features and examples
- API reference for TypeScript interfaces
- Troubleshooting guide for common issues
- Example server implementations

### Performance
- Debounced DOM rendering in settings UI
- Graceful error handling with timeouts
- Connection cleanup on shutdown
- Optimized bundle size (+10.4 KiB for full MCP stack)

### Security
- Permission-based context sharing
- Domain restriction enforcement
- No data shared without explicit consent
- Secure IPC communication for MCP operations

## [1.0.0] - 2024-12-XX

### Added
- Initial stable release
- Complete feature set as described above
- Production-ready build system
- Comprehensive documentation
- Distribution packages for all platforms

### Security
- Electron security best practices implemented
- Context isolation enabled
- Secure IPC communication
- Sandboxed webview for browsing