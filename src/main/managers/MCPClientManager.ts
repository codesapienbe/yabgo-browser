import { EventEmitter } from 'events';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import SupervisedStdioTransport from './SupervisedStdioTransport';
import type { MCPServerConfig, MCPToolCall, MCPToolResult } from '../../types/mcp.types.js';
import type { Tool, Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Manages MCP client connections and tool execution
 */
export class MCPClientManager extends EventEmitter {
    private clients: Map<string, Client> = new Map();
    private transports: Map<string, StdioClientTransport> = new Map();
    private supervisedChildProcesses: Map<string, ChildProcessWithoutNullStreams> = new Map();
    private configs: Map<string, MCPServerConfig> = new Map();
    private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
    private reconnectAttempts: Map<string, number> = new Map();
    private lastStderr: Map<string, string> = new Map();
    private nextReconnectAt: Map<string, number> = new Map();
    private nextDelay: Map<string, number> = new Map();
    private readonly MAX_RECONNECT_ATTEMPTS = 6;
    private readonly INITIAL_RECONNECT_DELAY_MS = 1000; // 1s
    private readonly MAX_RECONNECT_DELAY_MS = 300000; // 5m

    constructor() {
        super();
    }

    /**
     * Connect to an MCP server
     */
    async connectToServer(config: MCPServerConfig): Promise<boolean> {
        try {
            console.log(`[MCP] Connecting to server: ${config.name}`, { config });

            // Choose transport: supervised (spawned by app) or SDK stdio transport
            let transport: any;
            let childProcess: ChildProcessWithoutNullStreams | undefined;

            if (config.supervise) {
                try {
                    childProcess = spawn(config.command, config.args || [], {
                        env: { ...(config.env || {}) },
                        cwd: config.cwd || undefined,
                        stdio: ['pipe', 'pipe', 'pipe'],
                        shell: false
                    }) as ChildProcessWithoutNullStreams;

                    // attach logging for child stdout/stderr and forward stderr to MCP error events
                    if (childProcess.stdout) {
                        childProcess.stdout.on('data', (chunk: Buffer) => {
                            const text = chunk.toString('utf8').trim();
                            if (text) console.log(`[MCP][${config.id}][stdout]`, text);
                        });
                    }
                    if (childProcess.stderr) {
                        childProcess.stderr.on('data', (chunk: Buffer) => {
                            const text = chunk.toString('utf8').trim();
                            if (text) {
                                console.error(`[MCP][${config.id}][stderr]`, text);
                                // store last stderr line for UI
                                this.lastStderr.set(config.id, text);
                                if (this.listenerCount('error') > 0) this.emit('error', { serverId: config.id, error: new Error(text) });
                            }
                        });
                    }

                    this.supervisedChildProcesses.set(config.id, childProcess);
                    transport = new SupervisedStdioTransport(childProcess);
                } catch (err) {
                    console.error(`[MCP] Failed to spawn supervised process for ${config.id}:`, err);
                    // fallback to SDK transport
                    transport = new StdioClientTransport({
                        command: config.command,
                        args: config.args,
                        env: config.env,
                    });
                }
            } else {
                transport = new StdioClientTransport({
                    command: config.command,
                    args: config.args,
                    env: config.env,
                });
            }

            // Create client
            const client = new Client({
                name: 'yabgo-browser',
                version: '1.0.0',
            }, {
                capabilities: {},
            });

            // Connect using the selected transport
            await client.connect(transport);

            // Store references
            this.clients.set(config.id, client);
            this.transports.set(config.id, transport);
            this.configs.set(config.id, config);

            // Reset reconnect attempts and timers
            this.reconnectAttempts.set(config.id, 0);
            const existingTimer = this.reconnectTimers.get(config.id);
            if (existingTimer) {
                clearTimeout(existingTimer);
                this.reconnectTimers.delete(config.id);
            }

            // Attach close/error listeners to trigger reconnection when appropriate
            (client as any).on('close', (...args: any[]) => {
                console.warn(`[MCP] Client closed for ${config.id}`, { args });
                // Only attempt reconnect if server config remains enabled
                const stored = this.configs.get(config.id);
                if (stored && stored.enabled) {
                    // If supervise is enabled, attempt to restart the process first
                    if (stored.supervise) {
                        this.restartSupervisedProcess(config.id, stored);
                    } else {
                        this.startReconnect(config.id);
                    }
                }
                // Emit server-disconnected for UI
                this.emit('server-disconnected', config.id);
            });
            (client as any).on('error', (err: any) => {
                console.error(`[MCP] Client error for ${config.id}:`, err);
                if (this.listenerCount('error') > 0) this.emit('error', { serverId: config.id, error: err });
            });

            this.emit('server-connected', config.id);
            console.log(`[MCP] Successfully connected to: ${config.name}`, { serverId: config.id });

            return true;
        } catch (error) {
            console.error(`[MCP] Failed to connect to ${config.name}:`, error);
            // Only emit if there are listeners to avoid unhandled errors in tests
            if (this.listenerCount('error') > 0) {
                this.emit('error', { serverId: config.id, error });
            }
            return false;
        }
    }

    /**
     * Disconnect from an MCP server
     */
    async disconnectServer(serverId: string): Promise<void> {
        // Clear any reconnection timers
        const timer = this.reconnectTimers.get(serverId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(serverId);
        }

        // Reset reconnect attempts
        this.reconnectAttempts.delete(serverId);

        const client = this.clients.get(serverId);
        if (client) {
            try {
                await client.close();
            } catch (error) {
                console.error(`[MCP] Error closing client ${serverId}:`, error);
            }
            this.clients.delete(serverId);
            this.transports.delete(serverId);
            // If we supervised a child process, kill it
            const child = this.supervisedChildProcesses.get(serverId);
            if (child && !child.killed) {
                try {
                    child.kill();
                } catch (err) {
                    // ignore
                }
            }
            this.supervisedChildProcesses.delete(serverId);
            // Keep config around so user can re-enable later, but mark as disabled
            const cfg = this.configs.get(serverId);
            if (cfg) {
                cfg.enabled = false;
                this.configs.set(serverId, cfg);
            }
            this.emit('server-disconnected', serverId);
        }
    }

    /**
     * Enable or disable a server. When enabling, attempts to connect. When disabling, disconnects and stops reconnection.
     */
    public async setServerEnabled(serverConfig: MCPServerConfig, enabled: boolean): Promise<boolean> {
        // Update stored config
        this.configs.set(serverConfig.id, serverConfig);
        if (!enabled) {
            // Stop reconnect attempts and disconnect
            const timer = this.reconnectTimers.get(serverConfig.id);
            if (timer) {
                clearTimeout(timer);
                this.reconnectTimers.delete(serverConfig.id);
            }
            await this.disconnectServer(serverConfig.id);
            return true;
        }

        // Enable: try to connect if not already connected
        if (this.isConnected(serverConfig.id)) return true;
        return await this.connectToServer(serverConfig);
    }

    private startReconnect(serverId: string): void {
        const attempts = this.reconnectAttempts.get(serverId) || 0;
        if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
            console.warn(`[MCP] Max reconnect attempts reached for ${serverId}`);
            return;
        }

        const delay = Math.min(this.INITIAL_RECONNECT_DELAY_MS * Math.pow(2, attempts), this.MAX_RECONNECT_DELAY_MS);
        console.info(`[MCP] Scheduling reconnect for ${serverId} in ${delay}ms (attempt ${attempts + 1})`);

        const timer = setTimeout(async () => {
            // clear scheduled time and delay as we are executing the attempt
            this.nextReconnectAt.delete(serverId);
            this.nextDelay.delete(serverId);
            this.reconnectAttempts.set(serverId, (this.reconnectAttempts.get(serverId) || 0) + 1);
            const cfg = this.configs.get(serverId);
            if (!cfg) {
                console.warn(`[MCP] No config found for ${serverId}, aborting reconnect`);
                return;
            }
            // If the server was disabled while waiting, abort
            if (!cfg.enabled) {
                console.info(`[MCP] Server ${serverId} disabled; aborting reconnect`);
                return;
            }

            try {
                const ok = await this.connectToServer(cfg);
                if (!ok) {
                    // schedule next attempt
                    this.startReconnect(serverId);
                }
            } catch (err) {
                console.error(`[MCP] Reconnect attempt failed for ${serverId}:`, err);
                this.startReconnect(serverId);
            }
        }, delay) as unknown as NodeJS.Timeout;

        // Clear previous timer if any
        const prev = this.reconnectTimers.get(serverId);
        if (prev) clearTimeout(prev);
        this.reconnectTimers.set(serverId, timer);
        // store next scheduled attempt timestamp and the scheduled delay
        this.nextReconnectAt.set(serverId, Date.now() + delay);
        this.nextDelay.set(serverId, delay);
    }

    /**
     * Restart a supervised server process by attempting to reconnect (which spawns a new child process).
     */
    private async restartSupervisedProcess(serverId: string, config: MCPServerConfig): Promise<void> {
        try {
            console.info(`[MCP] Attempting supervised restart for ${serverId}`);
            // Ensure any existing client/transport are cleaned up
            await this.disconnectServer(serverId);

            // Small delay before restart to avoid tight restart loops
            await new Promise(r => setTimeout(r, 500));

            // Reconnect which will spawn a new process via StdioClientTransport
            const ok = await this.connectToServer(config);
            if (!ok) {
                console.warn(`[MCP] Supervised restart failed for ${serverId}, scheduling reconnect/backoff`);
                this.startReconnect(serverId);
            } else {
                console.info(`[MCP] Supervised restart succeeded for ${serverId}`);
            }
        } catch (err) {
            console.error(`[MCP] Supervised restart error for ${serverId}:`, err);
            this.startReconnect(serverId);
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
            console.log(`[MCP] Calling tool: ${toolCall.toolName}`, { toolCall });

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
            console.error(`[MCP] Tool call failed:`, error, { toolCall });
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
        // Clear all reconnection timers
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();

        // Disconnect all servers with error handling
        const disconnectPromises = Array.from(this.clients.keys()).map(id =>
            this.disconnectServer(id).catch(error => {
                console.error(`[MCP] Error disconnecting ${id}:`, error);
            })
        );
        await Promise.all(disconnectPromises);
    }
}

