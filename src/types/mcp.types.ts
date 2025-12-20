// Re-export MCP SDK types for convenience
export type { Tool, Resource, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

export interface MCPServerConfig {
    id: string;
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    enabled: boolean;
    // If true, the app will supervise (spawn and auto-restart) the server process
    supervise?: boolean;
    // Optional working directory for the server process
    cwd?: string;
    // If set, this server uses a bundled MCP package instead of external command
    // Value should be one of: 'filesystem', 'memory', 'everything', 'sequential-thinking'
    bundledServer?: string;
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


