import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPServerConfig, MCPToolCall, MCPToolResult } from '../../types/mcp.types.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Manages MCP client connections and tool execution
 */
export class MCPClientManager extends EventEmitter {
    private clients: Map<string, Client> = new Map();
    private transports: Map<string, StdioClientTransport> = new Map();
    private configs: Map<string, MCPServerConfig> = new Map();

    constructor() {
        super();
    }

    /**
     * Connect to an MCP server
     */
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

    /**
     * Disconnect from an MCP server
     */
    async disconnectServer(serverId: string): Promise<void> {
        const client = this.clients.get(serverId);
        if (client) {
            await client.close();
            this.clients.delete(serverId);
            this.transports.delete(serverId);
            this.configs.delete(serverId);
            this.emit('server-disconnected', serverId);
        }
    }

    /**
     * Check if a server is connected
     */
    isConnected(serverId: string): boolean {
        return this.clients.has(serverId);
    }

    /**
     * Get list of connected server IDs
     */
    getConnectedServers(): string[] {
        return Array.from(this.clients.keys());
    }

    /**
     * Discover tools from a connected server
     */
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

    /**
     * Call a tool on an MCP server
     */
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

    /**
     * List resources from a connected server
     */
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

    /**
     * Cleanup all connections
     */
    async cleanup(): Promise<void> {
        const disconnectPromises = Array.from(this.clients.keys()).map(id =>
            this.disconnectServer(id)
        );
        await Promise.all(disconnectPromises);
    }
}

