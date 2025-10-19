Default MCP Servers
===================

This document describes the default MCP servers bundled with YABGO Browser and how to enable or customize them.

Included (enabled by default):

- Filesystem (`@modelcontextprotocol/server-filesystem`)
  - Provides read/write and file utilities over MCP (no API key required).
  - By default it is pointed at the user's home directory.

- Memory (`@modelcontextprotocol/server-memory`)
  - In-memory knowledge graph server for quick demos. No API key.

- Everything (`@modelcontextprotocol/server-everything`)
  - Demo server that exposes a wide set of tools for showcasing MCP features. No API key.

- Starter (`mcp-starter`)
  - Minimal demo server used for onboarding; small and stable.

- SequentialThinking (`@modelcontextprotocol/server-sequential-thinking`)
  - Demonstration server for sequence/problem solving tools.

Optional (disabled by default):

- Brave Search (`@modelcontextprotocol/server-brave-search`)
  - Requires `BRAVE_API_KEY` environment variable. If you want to enable it, set `BRAVE_API_KEY` in your environment and enable the server in settings.

If you want to use different servers, edit `src/shared/utils/DefaultMCPServers.ts` or add servers through the MCP settings UI. Servers started via `npx` are spawned locally and do not require external hosting.

# Default MCP Servers

YABGO Browser now comes with 5 pre-configured MCP servers that are automatically added on first run. These servers provide commonly useful functionality for generic users.

## Included Default Servers

### 1. **Filesystem Server**
- **Command**: `npx -y @modelcontextprotocol/server-filesystem`
- **Purpose**: Read, write, and manage files on your local filesystem
- **Status**: Enabled by default
- **Permissions**: 
  - ✓ Share text selections
  - ✗ Share browsing history
  - ✗ Share page content
- **Use Cases**:
  - Read configuration files
  - Save web content to disk
  - Search for files
  - List directory contents
- **Example Usage**:
  ```
  @Filesystem read path=/home/user/notes.txt
  @Filesystem list path=/home/user/documents
  ```

### 2. **Memory Server**
- **Command**: `npx -y @modelcontextprotocol/server-memory`
- **Purpose**: Store and retrieve persistent notes and context across sessions
- **Status**: Enabled by default
- **Permissions**: 
  - ✓ Share browsing history
  - ✓ Share text selections
  - ✗ Share page content
- **Use Cases**:
  - Save important information for later
  - Create persistent reminders
  - Store context between browsing sessions
  - Build a personal knowledge base
- **Example Usage**:
  ```
  @Memory store key=research value="Working on AI project"
  @Memory retrieve key=research
  ```

### 3. **Brave Search Server**
- **Command**: `npx -y @modelcontextprotocol/server-brave-search`
- **Purpose**: Search the web using Brave Search API
- **Status**: Disabled by default (requires API key)
- **Permissions**: 
  - ✓ Share page content
  - ✓ Share text selections
  - ✗ Share browsing history
- **Setup**: 
  1. Get a free API key from [Brave Search API](https://brave.com/search/api/)
  2. Set environment variable: `export BRAVE_API_KEY=your_key_here`
  3. Enable the server in MCP Settings
- **Use Cases**:
  - Quick web searches without opening new tabs
  - Research topics
  - Find related information
  - Fact checking
- **Example Usage**:
  ```
  @BraveSearch query="latest TypeScript features"
  ```

### 4. **Git Server**
- **Command**: `npx -y @modelcontextprotocol/server-git`
- **Purpose**: Interact with Git repositories
- **Status**: Enabled by default
- **Permissions**: 
  - ✗ Share browsing history
  - ✗ Share page content
  - ✗ Share text selections
- **Use Cases**:
  - Check repository status
  - View commit history
  - Show file diffs
  - Manage branches
- **Example Usage**:
  ```
  @Git status path=/home/user/project
  @Git log path=/home/user/project limit=5
  ```

### 5. **Time Server**
- **Command**: `npx -y @modelcontextprotocol/server-time`
- **Purpose**: Get current time, date, and timezone information
- **Status**: Enabled by default
- **Permissions**: None required
- **Use Cases**:
  - Get current time in different timezones
  - Convert between timezones
  - Calculate time differences
  - Schedule reminders
- **Example Usage**:
  ```
  @Time current timezone=America/New_York
  @Time convert from=UTC to=Asia/Tokyo time=14:00
  ```

## First Run Initialization

When you start YABGO Browser for the first time (or if you have no MCP servers configured), these 5 servers will be automatically added to your configuration. You can:

- **Enable/Disable** any server in MCP Settings (⚙ button)
- **Delete** servers you don't need
- **Add more** servers from the MCP ecosystem
- **Modify permissions** for each server

## Installing MCP Server Dependencies

The default servers use `npx -y` which automatically downloads and runs the servers on first use. No manual installation required!

However, if you want to install them globally for faster startup:

```bash
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-memory
npm install -g @modelcontextprotocol/server-brave-search
npm install -g @modelcontextprotocol/server-git
npm install -g @modelcontextprotocol/server-time
```

## Using Default Servers

1. **Open MCP Settings**: Click the ⚙ button in the title bar
2. **View Servers**: See all configured servers including defaults
3. **Discover Tools**: Click 🔍 Discover to see available tools for each server
4. **Use in Browser**: Type `@ServerName` in the address bar to use tools

## Customizing Default Servers

You can modify the default server list by editing:
```
src/shared/utils/DefaultMCPServers.ts
```

After modification, rebuild the application:
```bash
npm run build
```

## Security & Privacy

Default servers follow the principle of least privilege:

- **Filesystem**: Only accesses your home directory and below
- **Memory**: Data stored locally in browser database
- **Brave Search**: Requires explicit API key setup
- **Git**: No network access, local operations only
- **Time**: No sensitive data access

You can review and adjust permissions for each server in MCP Settings.

## Troubleshooting

### Server Won't Connect
- Ensure Node.js is installed: `node --version`
- Check if npx is available: `npx --version`
- Verify network connection (for downloading servers)

### Brave Search Not Working
- Verify API key is set: `echo $BRAVE_API_KEY`
- Check API key is valid at [Brave Search API Dashboard](https://brave.com/search/api/)
- Enable the server in MCP Settings

### Slow First Startup
- First time running each server, npx downloads packages
- Subsequent runs will be faster
- Consider installing globally for best performance

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Official MCP Servers](https://github.com/modelcontextprotocol/servers)
- [YABGO MCP Integration Guide](./MCP_INTEGRATION.md)

---

**Last Updated**: 2025-10-17  
**YABGO Browser Version**: 1.1.0+

