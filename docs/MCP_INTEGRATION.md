# MCP Integration Guide

## Overview

YABGO Browser integrates the Model Context Protocol (MCP) to enable seamless AI-powered tool integration. This guide explains how to use MCP features and configure MCP servers.

## Table of Contents

- [What is MCP?](#what-is-mcp)
- [Getting Started](#getting-started)
- [Adding MCP Servers](#adding-mcp-servers)
- [Using MCP Tools](#using-mcp-tools)
- [Security & Privacy](#security--privacy)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## What is MCP?

The Model Context Protocol (MCP) is an open standard that allows applications to connect to AI tools and services. YABGO Browser's MCP integration lets you:

- Execute tools from connected MCP servers
- Share browsing context with AI assistants (with your permission)
- Automate tasks through simple commands
- Integrate with external services and APIs

## Getting Started

### Prerequisites

- YABGO Browser v1.0.9 or later
- An MCP server (see [Examples](#examples) for demo servers)
- Node.js (if using Node-based MCP servers)

### Quick Start

1. Click the **⚙ (Settings)** button in the title bar
2. Click **"+ Add MCP Server"**
3. Configure your server details
4. Click **"Save & Connect"**
5. Use your server by typing `@servername` in the address bar

## Adding MCP Servers

### Opening Settings

Click the **⚙** button in the top-right corner of the title bar, or click the **MCP indicator** (shows "X MCP" when servers are configured).

### Server Configuration

**Required Fields:**
- **Server Name**: A friendly name for identification (e.g., "GitHub Tools")
- **Command**: The executable to run (e.g., `node`, `python`, `npx`)
- **Arguments**: Command-line arguments (comma-separated, e.g., `path/to/server.js`)

**Optional Fields:**
- **Environment Variables**: Set via command-line before starting YABGO

### Permissions

Configure what data the MCP server can access:

- **Share browsing history**: Allow access to your browsing history
- **Share page content**: Allow access to current page content
- **Share text selections**: Allow access to selected text on pages

**Domain Restrictions**: (Future feature) Limit access to specific domains only

### Example Configuration

**Name:** Demo Server
**Command:** `node`
**Arguments:** `/home/user/mcp-servers/demo/server.js`

**Permissions:**
- ✓ Share browsing history
- ✗ Share page content
- ✓ Share text selections

## Using MCP Tools

### Command Syntax

```
@servername toolname param1=value1 param2=value2
```

**Examples:**

```
@github search-repos query=typescript stars>1000
@filesystem read-file path=/home/user/notes.txt
@demo greet name=Alice
```

### Parameter Formats

**Key-Value Pairs:**
```
@server tool name=Alice age=30 city=Paris
```

**JSON Format:**
```
@server tool {"name":"Alice","age":30,"city":"Paris"}
```

### Autocomplete

Type `@` in the address bar to see available MCP servers. The system will suggest servers as you type.

### Viewing Results

Results appear in the assistant response panel below the address bar:

```
✓ Tool executed successfully:

Hello, Alice!
```

Error messages are also displayed:

```
✗ Tool execution failed:
Server 'myserver' not found.

Available servers: demo-server, github-tools
```

## Security & Privacy

### Permission Model

YABGO Browser uses a **permission-based** security model:

1. **Explicit Consent**: You control what data each server can access
2. **Per-Server Permissions**: Each server has independent permission settings
3. **Privacy-First**: No data is shared without your explicit permission

### Domain Restrictions

When configured, domain restrictions ensure servers only access data from approved websites:

- If `allowedDomains` is empty: All domains allowed
- If `allowedDomains` contains values: Only those domains shared
- Restricted URLs appear as `[restricted]` to the server

### Context Sharing

**What gets shared** (based on permissions):
- Current page URL and title
- Selected text (if "Share text selections" is enabled)
- Timestamp of page visit

**What never gets shared**:
- Passwords or form data
- Cookies or session tokens
- Private browsing data
- Full page HTML (only metadata)

### Best Practices

1. **Review Permissions**: Only grant necessary permissions
2. **Trust Your Servers**: Only connect to servers you trust
3. **Monitor Activity**: Watch the MCP indicator for unexpected activity
4. **Regular Audits**: Periodically review configured servers

## MCP Status Indicator

### Location

Top-right corner, below the title bar

### States

- **Green Pulse**: Idle, servers connected
- **Blue Fast Pulse**: Tool currently executing
- **Red Flash**: Error occurred (clears after 3 seconds)
- **Hidden**: No servers configured

### Interaction

Click the indicator to open MCP settings.

## Examples

### Demo MCP Server

A simple demo server for testing:

```bash
# Install demo server
npm install -g @modelcontextprotocol/demo-server

# Configure in YABGO
Name: Demo
Command: npx
Arguments: @modelcontextprotocol/demo-server
```

### Custom Node.js Server

Create `my-server.js`:

```javascript
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
  name: 'my-custom-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'greet',
      description: 'Greets a user',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
    },
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'greet') {
    const name = request.params.arguments?.name || 'World';
    return {
      content: [
        {
          type: 'text',
          text: `Hello, ${name}!`,
        },
      ],
    };
  }
  throw new Error('Unknown tool');
});

const transport = new StdioServerTransport();
server.connect(transport);
```

Configure in YABGO:

```
Name: My Server
Command: node
Arguments: /path/to/my-server.js
```

## Troubleshooting

### Server Won't Connect

**Symptoms**: Error message when adding server

**Solutions**:
1. Verify the command exists: `which node` or `which python`
2. Check file path is absolute and correct
3. Ensure server script is executable
4. Check server logs for errors

### Tools Not Showing

**Symptoms**: No tools discovered from server

**Solutions**:
1. Click "🔍 Discover" button to refresh tools
2. Verify server implements `tools/list` handler
3. Check server console output for errors
4. Restart YABGO Browser

### Tool Execution Fails

**Symptoms**: "✗ Tool execution failed" message

**Solutions**:
1. Check parameter format (key=value or JSON)
2. Verify required parameters are provided
3. Check server logs for detailed error
4. Test tool with minimal parameters first

### Context Not Being Shared

**Symptoms**: Server reports no context available

**Solutions**:
1. Verify permissions are enabled
2. Navigate to a page (not about:blank)
3. Check domain restrictions
4. Refresh the page to trigger context extraction

### Performance Issues

**Symptoms**: Slow tool execution or UI lag

**Solutions**:
1. Reduce number of connected servers
2. Clear context history (settings → clear)
3. Check server response time
4. Monitor CPU/memory usage

## Advanced Topics

### Environment Variables

Set environment variables before launching YABGO:

```bash
export API_KEY=your_key_here
export DEBUG=true
./yabgo-browser
```

Access in your MCP server:

```javascript
const apiKey = process.env.API_KEY;
```

### Tool History

All tool calls are logged to the database:

- Server ID
- Tool name
- Parameters
- Result
- Timestamp

**Location**: `~/.config/YABGO Browser/yabgo_history.db` (Linux)

### Programmatic Access

While not exposed in UI, the MCP bridge can be accessed programmatically:

```typescript
import { mcpBridge } from './bridge/mcp.bridge';

const result = await mcpBridge.callTool({
  serverId: 'my-server',
  toolName: 'my-tool',
  params: { key: 'value' },
  timestamp: Date.now()
});
```

## API Reference

### MCPServerConfig

```typescript
interface MCPServerConfig {
  id: string;              // Unique identifier
  name: string;            // Display name
  command: string;         // Executable command
  args: string[];          // Command arguments
  env?: Record<string, string>;  // Environment variables
  enabled: boolean;        // Active status
  permissions: {
    shareHistory: boolean;
    sharePageContent: boolean;
    shareSelections: boolean;
    allowedDomains: string[];
  };
  createdAt: number;       // Unix timestamp
  lastUsed?: number;       // Unix timestamp
}
```

### PageContext

```typescript
interface PageContext {
  url: string;             // Current page URL
  title: string;           // Page title
  selection?: string;      // Selected text (if permitted)
  timestamp: number;       // Unix timestamp
}
```

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [YABGO Browser Repository](https://github.com/yabgo/yabgo-browser)
- [Example MCP Servers](https://github.com/modelcontextprotocol/servers)

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review [GitHub Issues](https://github.com/yabgo/yabgo-browser/issues)
3. Join the YABGO community discussions
4. Read MCP protocol documentation

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-17  
**YABGO Browser Version**: 1.0.9+

