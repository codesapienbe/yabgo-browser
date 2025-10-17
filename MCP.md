# MCP Client Implementation Plan - Detailed Commit Phases

Here's a granular, commit-by-commit implementation plan for integrating MCP into YABGO Browser. Each phase produces working, testable code.[^1][^2]

## Phase 1: Foundation \& Dependencies

### Commit 1.1: Project Setup \& Dependencies

**Branch:** `feature/mcp-foundation`

```bash
# Install MCP TypeScript SDK
npm install @modelcontextprotocol/sdk

# Install additional type definitions
npm install --save-dev @types/better-sqlite3
```

**Files Changed:**

- `package.json` - Add MCP SDK dependency[^3][^1]
- `package-lock.json` - Lock dependency versions

**Testing:** `npm install` should complete successfully

***

### Commit 1.2: TypeScript Types \& Interfaces

**Files Created:**

- `src/types/mcp.types.ts`

```typescript
// src/types/mcp.types.ts
import { Tool, Resource, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
  permissions: MCPPermissions;
  createdAt: number;
  lastUsed?: number;
}

export interface MCPPermissions {
  shareHistory: boolean;
  sharePageContent: boolean;
  shareSelections: boolean;
  allowedDomains: string[];
}

export interface PageContext {
  url: string;
  title: string;
  selection?: string;
  timestamp: number;
}

export interface MCPToolCall {
  serverId: string;
  toolName: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
}
```

**Testing:** `npm run build` should compile without errors[^2]

***

### Commit 1.3: Database Schema Extension

**Files Changed:**

- `src/main/managers/DatabaseManager.ts`

```typescript
// Add to DatabaseManager.ts initialization
private initializeMCPTables(): void {
  this.db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_used INTEGER
    );

    CREATE TABLE IF NOT EXISTS mcp_tool_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      params TEXT,
      result TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(server_id) REFERENCES mcp_servers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tool_history_server 
      ON mcp_tool_history(server_id);
    CREATE INDEX IF NOT EXISTS idx_tool_history_timestamp 
      ON mcp_tool_history(timestamp);
  `);
}

// Add to constructor
constructor(dbPath: string) {
  // ... existing code ...
  this.initializeMCPTables();
}
```

**Testing:** Launch app, verify database contains new tables using SQLite browser[^2]

***

## Phase 2: Core MCP Client Manager

### Commit 2.1: Basic MCPClientManager Structure

**Files Created:**

- `src/main/managers/MCPClientManager.ts`

```typescript
// src/main/managers/MCPClientManager.ts
import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPServerConfig, MCPToolCall, MCPToolResult } from '../../types/mcp.types.js';

export class MCPClientManager extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport> = new Map();
  private configs: Map<string, MCPServerConfig> = new Map();

  constructor() {
    super();
  }

  async connectToServer(config: MCPServerConfig): Promise<boolean> {
    try {
      console.log(`[MCP] Connecting to server: ${config.name}`);
      
      // Create stdio transport
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      // Create client
      const client = new Client({
        name: 'yabgo-browser',
        version: '1.0.0',
      }, {
        capabilities: {},
      });

      // Connect
      await client.connect(transport);
      
      // Store references
      this.clients.set(config.id, client);
      this.transports.set(config.id, transport);
      this.configs.set(config.id, config);

      this.emit('server-connected', config.id);
      console.log(`[MCP] Successfully connected to: ${config.name}`);
      
      return true;
    } catch (error) {
      console.error(`[MCP] Failed to connect to ${config.name}:`, error);
      this.emit('error', { serverId: config.id, error });
      return false;
    }
  }

  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
      this.clients.delete(serverId);
      this.transports.delete(serverId);
      this.emit('server-disconnected', serverId);
    }
  }

  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.keys()).map(id => 
      this.disconnectServer(id)
    );
    await Promise.all(disconnectPromises);
  }
}
```

**Testing:** Create unit test for connection/disconnection[^4][^5]

***

### Commit 2.2: Tool Discovery \& Execution

**Files Changed:**

- `src/main/managers/MCPClientManager.ts`

```typescript
// Add to MCPClientManager class

async discoverTools(serverId: string): Promise<Tool[]> {
  const client = this.clients.get(serverId);
  if (!client) {
    throw new Error(`Server ${serverId} not connected`);
  }

  try {
    const response = await client.listTools();
    const tools = response.tools || [];
    
    this.emit('tools-discovered', { serverId, tools });
    console.log(`[MCP] Discovered ${tools.length} tools from ${serverId}`);
    
    return tools;
  } catch (error) {
    console.error(`[MCP] Failed to discover tools from ${serverId}:`, error);
    throw error;
  }
}

async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
  const client = this.clients.get(toolCall.serverId);
  if (!client) {
    return {
      success: false,
      error: `Server ${toolCall.serverId} not connected`,
      timestamp: Date.now(),
    };
  }

  try {
    console.log(`[MCP] Calling tool: ${toolCall.toolName}`);
    
    const response = await client.callTool({
      name: toolCall.toolName,
      arguments: toolCall.params,
    });

    const result: MCPToolResult = {
      success: true,
      data: response.content,
      timestamp: Date.now(),
    };

    this.emit('tool-called', { toolCall, result });
    
    return result;
  } catch (error) {
    console.error(`[MCP] Tool call failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

async listResources(serverId: string): Promise<Resource[]> {
  const client = this.clients.get(serverId);
  if (!client) {
    throw new Error(`Server ${serverId} not connected`);
  }

  try {
    const response = await client.listResources();
    return response.resources || [];
  } catch (error) {
    console.error(`[MCP] Failed to list resources from ${serverId}:`, error);
    throw error;
  }
}
```

**Testing:** Mock MCP server for tool discovery/execution tests[^1]

***

### Commit 2.3: Server Configuration Persistence

**Files Changed:**

- `src/main/managers/DatabaseManager.ts`

```typescript
// Add MCP-related database methods

saveMCPServer(config: MCPServerConfig): void {
  const stmt = this.db.prepare(`
    INSERT OR REPLACE INTO mcp_servers (id, name, config, created_at, last_used)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    config.id,
    config.name,
    JSON.stringify(config),
    config.createdAt,
    config.lastUsed || null
  );
}

getMCPServers(): MCPServerConfig[] {
  const rows = this.db.prepare('SELECT config FROM mcp_servers WHERE 1=1').all();
  return rows.map(row => JSON.parse((row as any).config));
}

deleteMCPServer(serverId: string): void {
  this.db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(serverId);
  this.db.prepare('DELETE FROM mcp_tool_history WHERE server_id = ?').run(serverId);
}

saveMCPToolCall(serverId: string, toolCall: MCPToolCall, result: MCPToolResult): void {
  const stmt = this.db.prepare(`
    INSERT INTO mcp_tool_history (server_id, tool_name, params, result, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    serverId,
    toolCall.toolName,
    JSON.stringify(toolCall.params),
    JSON.stringify(result),
    toolCall.timestamp
  );
}

getMCPToolHistory(serverId: string, limit: number = 50): any[] {
  return this.db.prepare(`
    SELECT * FROM mcp_tool_history 
    WHERE server_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `).all(serverId, limit);
}
```

**Testing:** Test CRUD operations for server configs[^2]

***

## Phase 3: IPC Communication Layer

### Commit 3.1: MCP IPC Channels

**Files Changed:**

- `src/main/managers/IPCManager.ts`

```typescript
// Add to IPCManager class

private setupMCPHandlers(): void {
  // Connect to MCP server
  ipcMain.handle('mcp:connect-server', async (event, config: MCPServerConfig) => {
    try {
      const success = await this.mcpClientManager.connectToServer(config);
      if (success) {
        this.databaseManager.saveMCPServer(config);
      }
      return { success, serverId: config.id };
    } catch (error) {
      console.error('[IPC] MCP connect error:', error);
      return { success: false, error: error.message };
    }
  });

  // Disconnect from MCP server
  ipcMain.handle('mcp:disconnect-server', async (event, serverId: string) => {
    try {
      await this.mcpClientManager.disconnectServer(serverId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] MCP disconnect error:', error);
      return { success: false, error: error.message };
    }
  });

  // Discover tools
  ipcMain.handle('mcp:discover-tools', async (event, serverId: string) => {
    try {
      const tools = await this.mcpClientManager.discoverTools(serverId);
      return { success: true, tools };
    } catch (error) {
      console.error('[IPC] MCP discover tools error:', error);
      return { success: false, error: error.message };
    }
  });

  // Call tool
  ipcMain.handle('mcp:call-tool', async (event, toolCall: MCPToolCall) => {
    try {
      const result = await this.mcpClientManager.callTool(toolCall);
      this.databaseManager.saveMCPToolCall(toolCall.serverId, toolCall, result);
      return result;
    } catch (error) {
      console.error('[IPC] MCP call tool error:', error);
      return { 
        success: false, 
        error: error.message,
        timestamp: Date.now() 
      };
    }
  });

  // Get saved servers
  ipcMain.handle('mcp:get-servers', async () => {
    try {
      const servers = this.databaseManager.getMCPServers();
      return { success: true, servers };
    } catch (error) {
      console.error('[IPC] MCP get servers error:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete server
  ipcMain.handle('mcp:delete-server', async (event, serverId: string) => {
    try {
      await this.mcpClientManager.disconnectServer(serverId);
      this.databaseManager.deleteMCPServer(serverId);
      return { success: true };
    } catch (error) {
      console.error('[IPC] MCP delete server error:', error);
      return { success: false, error: error.message };
    }
  });

  // Forward events to renderer
  this.mcpClientManager.on('server-connected', (serverId) => {
    this.mainWindow?.webContents.send('mcp:server-connected', serverId);
  });

  this.mcpClientManager.on('tools-discovered', (data) => {
    this.mainWindow?.webContents.send('mcp:tools-discovered', data);
  });

  this.mcpClientManager.on('error', (data) => {
    this.mainWindow?.webContents.send('mcp:error', data);
  });
}

// Add to constructor
constructor(mainWindow: BrowserWindow, databaseManager: DatabaseManager, mcpClientManager: MCPClientManager) {
  this.mainWindow = mainWindow;
  this.databaseManager = databaseManager;
  this.mcpClientManager = mcpClientManager;
  
  this.setupHandlers();
  this.setupMCPHandlers(); // Add this line
}
```

**Files Changed:**

- `src/main/index.ts` - Initialize MCPClientManager

```typescript
// Add to main/index.ts
import { MCPClientManager } from './managers/MCPClientManager.js';

// In createWindow or app initialization
const mcpClientManager = new MCPClientManager();
const ipcManager = new IPCManager(mainWindow, databaseManager, mcpClientManager);

// Cleanup on quit
app.on('before-quit', async () => {
  await mcpClientManager.cleanup();
});
```

**Testing:** Test IPC handlers with mock renderer calls[^2]

***

### Commit 3.2: Renderer IPC Bridge

**Files Created:**

- `src/renderer/bridge/mcp.bridge.ts`

```typescript
// src/renderer/bridge/mcp.bridge.ts
import type { MCPServerConfig, MCPToolCall, MCPToolResult } from '../../types/mcp.types.js';

export class MCPBridge {
  async connectServer(config: MCPServerConfig): Promise<{ success: boolean; serverId?: string; error?: string }> {
    return await window.electron.ipcRenderer.invoke('mcp:connect-server', config);
  }

  async disconnectServer(serverId: string): Promise<{ success: boolean; error?: string }> {
    return await window.electron.ipcRenderer.invoke('mcp:disconnect-server', serverId);
  }

  async discoverTools(serverId: string): Promise<{ success: boolean; tools?: any[]; error?: string }> {
    return await window.electron.ipcRenderer.invoke('mcp:discover-tools', serverId);
  }

  async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
    return await window.electron.ipcRenderer.invoke('mcp:call-tool', toolCall);
  }

  async getServers(): Promise<{ success: boolean; servers?: MCPServerConfig[]; error?: string }> {
    return await window.electron.ipcRenderer.invoke('mcp:get-servers');
  }

  async deleteServer(serverId: string): Promise<{ success: boolean; error?: string }> {
    return await window.electron.ipcRenderer.invoke('mcp:delete-server', serverId);
  }

  onServerConnected(callback: (serverId: string) => void): () => void {
    const handler = (_event: any, serverId: string) => callback(serverId);
    window.electron.ipcRenderer.on('mcp:server-connected', handler);
    return () => window.electron.ipcRenderer.removeListener('mcp:server-connected', handler);
  }

  onToolsDiscovered(callback: (data: any) => void): () => void {
    const handler = (_event: any, data: any) => callback(data);
    window.electron.ipcRenderer.on('mcp:tools-discovered', handler);
    return () => window.electron.ipcRenderer.removeListener('mcp:tools-discovered', handler);
  }

  onError(callback: (data: any) => void): () => void {
    const handler = (_event: any, data: any) => callback(data);
    window.electron.ipcRenderer.on('mcp:error', handler);
    return () => window.electron.ipcRenderer.removeListener('mcp:error', handler);
  }
}

// Singleton instance
export const mcpBridge = new MCPBridge();
```

**Testing:** Verify bridge methods call correct IPC channels[^2]

***

## Phase 4: Basic UI Integration

### Commit 4.1: MCP Settings Panel HTML/CSS

**Files Created:**

- `src/renderer/mcp-settings.html`

```html
<!-- Add to existing settings or create new panel -->
<div id="mcp-settings" class="settings-section">
  <h2>MCP Servers</h2>
  
  <div class="mcp-server-list" id="mcpServerList">
    <!-- Server items will be added dynamically -->
  </div>
  
  <button id="addMCPServerBtn" class="btn-primary">
    + Add MCP Server
  </button>
  
  <!-- Add Server Modal -->
  <div id="mcpServerModal" class="modal hidden">
    <div class="modal-content">
      <h3>Add MCP Server</h3>
      
      <label>Server Name</label>
      <input type="text" id="mcpServerName" placeholder="My MCP Server">
      
      <label>Command</label>
      <input type="text" id="mcpServerCommand" placeholder="node">
      
      <label>Arguments (comma-separated)</label>
      <input type="text" id="mcpServerArgs" placeholder="path/to/server.js">
      
      <div class="permissions-section">
        <h4>Permissions</h4>
        <label>
          <input type="checkbox" id="permShareHistory">
          Share browsing history
        </label>
        <label>
          <input type="checkbox" id="permShareContent">
          Share page content
        </label>
        <label>
          <input type="checkbox" id="permShareSelection">
          Share text selections
        </label>
      </div>
      
      <div class="modal-actions">
        <button id="mcpSaveBtn" class="btn-primary">Save & Connect</button>
        <button id="mcpCancelBtn" class="btn-secondary">Cancel</button>
      </div>
    </div>
  </div>
</div>
```

**Files Changed:**

- `src/renderer/styles.css`

```css
/* MCP Settings Styles */
.mcp-server-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 20px 0;
}

.mcp-server-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mcp-server-info {
  flex: 1;
}

.mcp-server-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.mcp-server-status {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.mcp-server-status.connected {
  color: #4ade80;
}

.mcp-server-actions {
  display: flex;
  gap: 8px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal.hidden {
  display: none;
}

.modal-content {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 24px;
  width: 500px;
  max-width: 90%;
}

.permissions-section {
  margin: 16px 0;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.permissions-section label {
  display: block;
  margin: 8px 0;
  font-size: 13px;
}
```

**Testing:** Visual inspection of settings panel[^2]

***

### Commit 4.2: MCP Settings Manager

**Files Created:**

- `src/renderer/managers/MCPSettingsManager.ts`

```typescript
// src/renderer/managers/MCPSettingsManager.ts
import { EventEmitter } from 'events';
import { mcpBridge } from '../bridge/mcp.bridge.js';
import type { MCPServerConfig } from '../../types/mcp.types.js';

export class MCPSettingsManager extends EventEmitter {
  private servers: MCPServerConfig[] = [];
  private modal: HTMLElement | null = null;
  private serverList: HTMLElement | null = null;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    this.setupDOM();
    this.setupEventListeners();
    await this.loadServers();
  }

  private setupDOM(): void {
    this.modal = document.getElementById('mcpServerModal');
    this.serverList = document.getElementById('mcpServerList');
  }

  private setupEventListeners(): void {
    // Add server button
    document.getElementById('addMCPServerBtn')?.addEventListener('click', () => {
      this.showAddServerModal();
    });

    // Modal actions
    document.getElementById('mcpSaveBtn')?.addEventListener('click', () => {
      this.saveServer();
    });

    document.getElementById('mcpCancelBtn')?.addEventListener('click', () => {
      this.hideModal();
    });

    // Listen for server events
    mcpBridge.onServerConnected((serverId) => {
      console.log(`[MCP UI] Server connected: ${serverId}`);
      this.updateServerStatus(serverId, 'connected');
    });

    mcpBridge.onError((data) => {
      console.error(`[MCP UI] Error:`, data);
      this.showError(data.error);
    });
  }

  private async loadServers(): Promise<void> {
    const response = await mcpBridge.getServers();
    if (response.success && response.servers) {
      this.servers = response.servers;
      this.renderServers();
    }
  }

  private renderServers(): void {
    if (!this.serverList) return;

    this.serverList.innerHTML = this.servers.map(server => `
      <div class="mcp-server-item" data-server-id="${server.id}">
        <div class="mcp-server-info">
          <div class="mcp-server-name">${server.name}</div>
          <div class="mcp-server-status" id="status-${server.id}">
            ${server.enabled ? 'Enabled' : 'Disabled'}
          </div>
        </div>
        <div class="mcp-server-actions">
          <button class="btn-icon" onclick="mcpSettings.discoverTools('${server.id}')">
            🔍 Discover
          </button>
          <button class="btn-icon" onclick="mcpSettings.deleteServer('${server.id}')">
            🗑️ Delete
          </button>
        </div>
      </div>
    `).join('');
  }

  private showAddServerModal(): void {
    if (this.modal) {
      this.modal.classList.remove('hidden');
    }
  }

  private hideModal(): void {
    if (this.modal) {
      this.modal.classList.add('hidden');
      this.clearForm();
    }
  }

  private clearForm(): void {
    (document.getElementById('mcpServerName') as HTMLInputElement).value = '';
    (document.getElementById('mcpServerCommand') as HTMLInputElement).value = '';
    (document.getElementById('mcpServerArgs') as HTMLInputElement).value = '';
  }

  private async saveServer(): Promise<void> {
    const name = (document.getElementById('mcpServerName') as HTMLInputElement).value;
    const command = (document.getElementById('mcpServerCommand') as HTMLInputElement).value;
    const argsStr = (document.getElementById('mcpServerArgs') as HTMLInputElement).value;
    
    if (!name || !command) {
      this.showError('Name and command are required');
      return;
    }

    const config: MCPServerConfig = {
      id: `mcp-${Date.now()}`,
      name,
      command,
      args: argsStr.split(',').map(s => s.trim()).filter(Boolean),
      enabled: true,
      permissions: {
        shareHistory: (document.getElementById('permShareHistory') as HTMLInputElement).checked,
        sharePageContent: (document.getElementById('permShareContent') as HTMLInputElement).checked,
        shareSelections: (document.getElementById('permShareSelection') as HTMLInputElement).checked,
        allowedDomains: [],
      },
      createdAt: Date.now(),
    };

    const response = await mcpBridge.connectServer(config);
    if (response.success) {
      this.servers.push(config);
      this.renderServers();
      this.hideModal();
    } else {
      this.showError(response.error || 'Failed to connect server');
    }
  }

  async discoverTools(serverId: string): Promise<void> {
    const response = await mcpBridge.discoverTools(serverId);
    if (response.success && response.tools) {
      console.log(`[MCP] Tools discovered:`, response.tools);
      this.showToolsDialog(serverId, response.tools);
    } else {
      this.showError(response.error || 'Failed to discover tools');
    }
  }

  async deleteServer(serverId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this server?')) {
      const response = await mcpBridge.deleteServer(serverId);
      if (response.success) {
        this.servers = this.servers.filter(s => s.id !== serverId);
        this.renderServers();
      }
    }
  }

  private updateServerStatus(serverId: string, status: string): void {
    const statusEl = document.getElementById(`status-${serverId}`);
    if (statusEl) {
      statusEl.textContent = status;
      statusEl.classList.add('connected');
    }
  }

  private showToolsDialog(serverId: string, tools: any[]): void {
    alert(`Found ${tools.length} tools:\n${tools.map(t => t.name).join('\n')}`);
  }

  private showError(message: string): void {
    // TODO: Implement proper error toast
    console.error('[MCP Settings]', message);
    alert(`Error: ${message}`);
  }
}

// Global instance for inline onclick handlers
(window as any).mcpSettings = new MCPSettingsManager();
```

**Testing:** Test adding/removing servers through UI[^2]

***

### Commit 4.3: Integrate MCP Settings into Main UI

**Files Changed:**

- `src/renderer/index.html` - Add settings link
- `src/renderer/renderer.ts` - Initialize MCPSettingsManager

```typescript
// Add to renderer.ts
import { MCPSettingsManager } from './managers/MCPSettingsManager.js';

// In initialization
const mcpSettingsManager = new MCPSettingsManager();
await mcpSettingsManager.initialize();
```

**Testing:** End-to-end test: add server, verify connection, discover tools[^2]

***

## Phase 5: Context Extraction \& Sharing

### Commit 5.1: MCPContextManager Implementation

**Files Created:**

- `src/main/managers/MCPContextManager.ts`

```typescript
// src/main/managers/MCPContextManager.ts
import { EventEmitter } from 'events';
import type { PageContext, MCPServerConfig } from '../../types/mcp.types.js';

export class MCPContextManager extends EventEmitter {
  private currentContext: PageContext | null = null;
  private contextHistory: PageContext[] = [];
  private maxHistorySize = 50;

  constructor() {
    super();
  }

  updateContext(context: PageContext, permissions: MCPServerConfig['permissions']): PageContext {
    // Filter context based on permissions
    const filteredContext = this.filterByPermissions(context, permissions);
    
    this.currentContext = filteredContext;
    this.contextHistory.unshift(filteredContext);
    
    if (this.contextHistory.length > this.maxHistorySize) {
      this.contextHistory = this.contextHistory.slice(0, this.maxHistorySize);
    }

    this.emit('context-updated', filteredContext);
    return filteredContext;
  }

  private filterByPermissions(context: PageContext, permissions: MCPServerConfig['permissions']): PageContext {
    const filtered: PageContext = {
      url: context.url,
      title: context.title,
      timestamp: context.timestamp,
    };

    // Only include selection if permitted
    if (permissions.shareSelections && context.selection) {
      filtered.selection = context.selection;
    }

    // Check domain restrictions
    if (permissions.allowedDomains.length > 0) {
      const url = new URL(context.url);
      const allowed = permissions.allowedDomains.some(domain => 
        url.hostname.includes(domain)
      );
      
      if (!allowed) {
        filtered.url = '[restricted]';
        filtered.title = '[restricted]';
      }
    }

    return filtered;
  }

  getCurrentContext(): PageContext | null {
    return this.currentContext;
  }

  getContextHistory(limit: number = 10): PageContext[] {
    return this.contextHistory.slice(0, limit);
  }

  clearHistory(): void {
    this.contextHistory = [];
    this.emit('history-cleared');
  }
}
```

**Testing:** Test context filtering with different permission levels[^6]

***

### Commit 5.2: WebView Context Extraction

**Files Changed:**

- `src/main/managers/IPCManager.ts`

```typescript
// Add context extraction handler
ipcMain.handle('mcp:extract-context', async (event, webviewId: string) => {
  try {
    // This will be called from renderer with webview state
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Files Changed:**

- `src/renderer/managers/NavigationManager.ts`

```typescript
// Add context extraction when navigation occurs
private async extractAndShareContext(): Promise<void> {
  const context: PageContext = {
    url: this.currentWebview?.getURL() || '',
    title: this.currentWebview?.getTitle() || '',
    timestamp: Date.now(),
  };

  // Share with MCP servers if enabled
  this.emit('context-changed', context);
}

// Hook into existing navigation events
private setupWebviewListeners(webview: Electron.WebviewTag): void {
  // ... existing code ...
  
  webview.addEventListener('did-finish-load', () => {
    this.extractAndShareContext();
  });
}
```

**Testing:** Verify context extraction on page navigation[^2]

***

## Phase 6: Assistant Integration

### Commit 6.1: MCP Tool Integration in Assistant

**Files Changed:**

- `src/renderer/managers/AssistantManager.ts`

```typescript
// Add MCP tool invocation capability
import { mcpBridge } from '../bridge/mcp.bridge.js';

private async handleMCPCommand(query: string): Promise<string> {
  // Parse MCP command: @servername toolname params
  const mcpMatch = query.match(/@(\S+)\s+(\S+)\s*(.*)/);
  
  if (!mcpMatch) {
    return 'Invalid MCP command format. Use: @servername toolname params';
  }

  const [, serverName, toolName, paramsStr] = mcpMatch;
  
  // Find server by name
  const serversResponse = await mcpBridge.getServers();
  if (!serversResponse.success) {
    return 'Failed to load MCP servers';
  }

  const server = serversResponse.servers?.find(s => s.name === serverName);
  if (!server) {
    return `Server '${serverName}' not found`;
  }

  // Parse params (simple JSON or key=value)
  let params = {};
  try {
    params = paramsStr ? JSON.parse(paramsStr) : {};
  } catch {
    // Try key=value format
    const pairs = paramsStr.split(/\s+/);
    params = pairs.reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      if (key && value) acc[key] = value;
      return acc;
    }, {});
  }

  // Call tool
  const result = await mcpBridge.callTool({
    serverId: server.id,
    toolName,
    params,
    timestamp: Date.now(),
  });

  if (result.success) {
    return this.formatMCPResult(result.data);
  } else {
    return `Error: ${result.error}`;
  }
}

private formatMCPResult(data: unknown): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data.map(item => this.formatMCPResult(item)).join('\n');
  }
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

// Integrate into existing query handler
async handleQuery(query: string): Promise<string> {
  // Check if it's an MCP command
  if (query.startsWith('@')) {
    return await this.handleMCPCommand(query);
  }

  // ... existing assistant logic ...
}
```

**Testing:** Test MCP tool invocation through assistant interface[^2]

***

### Commit 6.2: MCP Tool Suggestions

**Files Created:**

- `src/renderer/managers/MCPSuggestionsManager.ts`

```typescript
// src/renderer/managers/MCPSuggestionsManager.ts
import { EventEmitter } from 'events';
import { mcpBridge } from '../bridge/mcp.bridge.js';

export class MCPSuggestionsManager extends EventEmitter {
  private availableTools: Map<string, any[]> = new Map();

  async initialize(): Promise<void> {
    await this.loadAllTools();
  }

  private async loadAllTools(): Promise<void> {
    const serversResponse = await mcpBridge.getServers();
    if (!serversResponse.success || !serversResponse.servers) return;

    for (const server of serversResponse.servers) {
      if (!server.enabled) continue;
      
      const toolsResponse = await mcpBridge.discoverTools(server.id);
      if (toolsResponse.success && toolsResponse.tools) {
        this.availableTools.set(server.id, toolsResponse.tools);
      }
    }
  }

  getSuggestions(query: string): any[] {
    if (!query.startsWith('@')) return [];

    const suggestions: any[] = [];
    
    for (const [serverId, tools] of this.availableTools) {
      for (const tool of tools) {
        if (tool.name.toLowerCase().includes(query.slice(1).toLowerCase())) {
          suggestions.push({
            type: 'mcp-tool',
            serverId,
            tool,
            displayText: `@${tool.name}`,
            description: tool.description || 'MCP Tool',
          });
        }
      }
    }

    return suggestions;
  }
}
```

**Testing:** Test suggestion display in address bar[^2]

***

## Phase 7: UI Polish \& Indicators

### Commit 7.1: MCP Status Indicator

**Files Created:**

- `src/renderer/components/MCPIndicator.ts`

```typescript
// src/renderer/components/MCPIndicator.ts
export class MCPIndicator {
  private indicator: HTMLElement;

  constructor() {
    this.indicator = this.createIndicator();
    document.body.appendChild(this.indicator);
  }

  private createIndicator(): HTMLElement {
    const indicator = document.createElement('div');
    indicator.id = 'mcp-indicator';
    indicator.className = 'mcp-indicator hidden';
    indicator.innerHTML = `
      <div class="mcp-indicator-dot"></div>
      <div class="mcp-indicator-tooltip">MCP Servers Active</div>
    `;
    return indicator;
  }

  show(serverCount: number): void {
    this.indicator.classList.remove('hidden');
    this.indicator.querySelector('.mcp-indicator-tooltip')!.textContent = 
      `${serverCount} MCP Server${serverCount !== 1 ? 's' : ''} Active`;
  }

  hide(): void {
    this.indicator.classList.add('hidden');
  }

  setStatus(status: 'idle' | 'active' | 'error'): void {
    this.indicator.className = `mcp-indicator ${status}`;
  }
}
```

**Files Changed:**

- `src/renderer/styles.css`

```css
.mcp-indicator {
  position: fixed;
  top: 16px;
  right: 80px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  font-size: 12px;
  z-index: 9999;
  cursor: pointer;
}

.mcp-indicator.hidden {
  display: none;
}

.mcp-indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  animation: pulse 2s ease-in-out infinite;
}

.mcp-indicator.active .mcp-indicator-dot {
  background: #3b82f6;
}

.mcp-indicator.error .mcp-indicator-dot {
  background: #ef4444;
  animation: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.mcp-indicator-tooltip {
  white-space: nowrap;
}
```

**Testing:** Verify indicator appears when servers are connected[^2]

***

### Commit 7.2: Gesture Support for MCP Tool Palette

**Files Changed:**

- `src/renderer/managers/GestureManager.ts`

```typescript
// Add MCP palette gesture
private handleGestureAction(action: string): void {
  switch (action) {
    // ... existing gestures ...
    
    case 'mcp-palette':
      this.emit('show-mcp-palette');
      break;
  }
}

// Detect bottom-left corner swipe for MCP palette
private detectCornerSwipe(): void {
  // ... existing code ...
  
  if (this.startX < 50 && window.innerHeight - this.startY < 50) {
    // Bottom-left corner
    this.handleGestureAction('mcp-palette');
  }
}
```

**Files Created:**

- `src/renderer/components/MCPPalette.ts`

```typescript
// src/renderer/components/MCPPalette.ts
import { mcpBridge } from '../bridge/mcp.bridge.js';

export class MCPPalette {
  private palette: HTMLElement;
  private isVisible = false;

  constructor() {
    this.palette = this.createPalette();
    document.body.appendChild(this.palette);
  }

  private createPalette(): HTMLElement {
    const palette = document.createElement('div');
    palette.id = 'mcp-palette';
    palette.className = 'mcp-palette hidden';
    palette.innerHTML = `
      <div class="mcp-palette-header">
        <h3>MCP Tools</h3>
        <button class="close-btn">×</button>
      </div>
      <div class="mcp-palette-search">
        <input type="text" placeholder="Search tools..." />
      </div>
      <div class="mcp-palette-tools" id="mcpPaletteTools">
        <!-- Tools will be populated here -->
      </div>
    `;

    palette.querySelector('.close-btn')?.addEventListener('click', () => this.hide());
    
    return palette;
  }

  async show(): Promise<void> {
    this.palette.classList.remove('hidden');
    this.isVisible = true;
    await this.loadTools();
  }

  hide(): void {
    this.palette.classList.add('hidden');
    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private async loadTools(): Promise<void> {
    const serversResponse = await mcpBridge.getServers();
    if (!serversResponse.success || !serversResponse.servers) return;

    const toolsContainer = document.getElementById('mcpPaletteTools');
    if (!toolsContainer) return;

    toolsContainer.innerHTML = '';

    for (const server of serversResponse.servers) {
      if (!server.enabled) continue;

      const toolsResponse = await mcpBridge.discoverTools(server.id);
      if (toolsResponse.success && toolsResponse.tools) {
        const serverSection = document.createElement('div');
        serverSection.className = 'mcp-server-section';
        serverSection.innerHTML = `
          <div class="mcp-server-section-title">${server.name}</div>
          ${toolsResponse.tools.map(tool => `
            <div class="mcp-tool-item" data-server="${server.id}" data-tool="${tool.name}">
              <div class="mcp-tool-name">${tool.name}</div>
              <div class="mcp-tool-description">${tool.description || ''}</div>
            </div>
          `).join('')}
        `;
        toolsContainer.appendChild(serverSection);
      }
    }

    // Add click handlers
    toolsContainer.querySelectorAll('.mcp-tool-item').forEach(item => {
      item.addEventListener('click', () => {
        const serverId = item.getAttribute('data-server');
        const toolName = item.getAttribute('data-tool');
        if (serverId && toolName) {
          this.executeTool(serverId, toolName);
        }
      });
    });
  }

  private executeTool(serverId: string, toolName: string): void {
    // Emit event for assistant to handle
    window.dispatchEvent(new CustomEvent('mcp-tool-selected', {
      detail: { serverId, toolName }
    }));
    this.hide();
  }
}
```

**Testing:** Test gesture invocation and tool palette functionality[^2]

***

## Phase 8: Testing \& Documentation

### Commit 8.1: Unit Tests

**Files Created:**

- `tests/unit/MCPClientManager.test.ts`
- `tests/unit/MCPContextManager.test.ts`
- `tests/unit/MCPSettingsManager.test.ts`

```typescript
// tests/unit/MCPClientManager.test.ts
import { MCPClientManager } from '../../src/main/managers/MCPClientManager';

describe('MCPClientManager', () => {
  let manager: MCPClientManager;

  beforeEach(() => {
    manager = new MCPClientManager();
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  it('should initialize without errors', () => {
    expect(manager).toBeDefined();
  });

  it('should track connected servers', async () => {
    const servers = manager.getConnectedServers();
    expect(servers).toEqual([]);
  });

  // Add more tests...
});
```

**Testing:** Run `npm test` to verify all tests pass[^2]

***

### Commit 8.2: Integration Tests

**Files Created:**

- `tests/integration/mcp-workflow.test.ts`

```typescript
// tests/integration/mcp-workflow.test.ts
describe('MCP Integration Workflow', () => {
  it('should complete full MCP workflow', async () => {
    // 1. Add server
    // 2. Connect
    // 3. Discover tools
    // 4. Execute tool
    // 5. Verify result
  });
});
```

**Testing:** Run integration test suite[^2]

***

### Commit 8.3: Documentation

**Files Created:**

- `docs/MCP_INTEGRATION.md`

```markdown
# MCP Integration Guide

## Overview
YABGO Browser integrates Model Context Protocol (MCP) to enable seamless AI-powered tool integration.

## Adding MCP Servers

1. Open Settings (Ctrl+,)
2. Navigate to "MCP Servers" tab
3. Click "Add MCP Server"
4. Configure server details...

## Using MCP Tools

### Via Address Bar
Type `@servername toolname params` in the address bar

### Via Gesture
Swipe from bottom-left corner to open MCP tool palette

## Security & Privacy
All MCP integrations respect your privacy settings...
```

**Files Changed:**

- `README.md` - Add MCP section

**Testing:** Review documentation for clarity and completeness[^2]

***

### Commit 8.4: Example MCP Server

**Files Created:**

- `examples/demo-mcp-server/server.js`

```javascript
// Simple demo MCP server for testing
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

const server = new Server({
  name: 'demo-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// Add a simple tool
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'greet',
      description: 'Greets the user',
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

// Start server
const transport = new StdioServerTransport();
server.connect(transport);
```

**Files Created:**

- `examples/demo-mcp-server/package.json`

**Testing:** Test YABGO with demo server[^7][^3]

***

## Phase 9: Final Polish \& Release

### Commit 9.1: Performance Optimization

**Files Changed:**

- `src/main/managers/MCPClientManager.ts` - Add connection pooling
- `src/renderer/managers/MCPSettingsManager.ts` - Debounce UI updates

**Testing:** Performance benchmarks for tool calls and context extraction

***

### Commit 9.2: Error Handling \& Recovery

**Files Changed:**

- All manager files - Add comprehensive error handling
- Add retry logic for failed connections
- Graceful degradation when MCP unavailable

**Testing:** Simulate error scenarios and verify recovery[^2]

***

### Commit 9.3: Release Preparation

**Files Changed:**

- `CHANGELOG.md` - Add MCP feature documentation
- `package.json` - Bump version to 1.1.0
- Build scripts - Test production builds

**Testing:** Full end-to-end testing on all platforms[^2]

***

## Summary of Implementation Phases

**Phase 1** (3 commits): Foundation - Dependencies, types, database schema
**Phase 2** (3 commits): Core MCP client - Connection, discovery, execution
**Phase 3** (2 commits): IPC layer - Main ↔ Renderer communication
**Phase 4** (3 commits): Basic UI - Settings panel, server management
**Phase 5** (2 commits): Context extraction - Privacy-aware context sharing
**Phase 6** (2 commits): Assistant integration - Tool invocation, suggestions
**Phase 7** (2 commits): UI polish - Indicators, gestures, palette
**Phase 8** (4 commits): Testing - Unit, integration, docs, examples
**Phase 9** (3 commits): Final polish - Performance, errors, release

**Total:** 24 atomic, testable commits that build upon each other.
