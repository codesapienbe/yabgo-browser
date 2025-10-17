// Re-export MCP SDK types for convenience
export type { Tool, Resource, ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';

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


