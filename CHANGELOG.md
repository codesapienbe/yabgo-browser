# Changelog

All notable changes to YABGO Browser will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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