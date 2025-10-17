import { EventEmitter } from '../utils/EventEmitter';
import { HistoryManager } from './HistoryManager';
import { mcpBridge } from '../bridge/mcp.bridge';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages assistant interactions in a renderer process
 */
export class AssistantManager extends EventEmitter {
    // @ts-expect-error - Reserved for future use
    private historyManager: HistoryManager;
    private logger: Logger;
    private isProcessing: boolean = false;

    constructor(historyManager: HistoryManager) {
        super();
        this.historyManager = historyManager;
        this.logger = new Logger('AssistantManager');
    }

    /**
     * Initialize assistant manager
     */
    public async initialize(): Promise<void> {
        this.logger.info('Assistant manager initialized');
    }

    /**
     * Process assistant query
     */
    public async processQuery(query: string): Promise<void> {
        if (this.isProcessing) {
            this.logger.warn('Assistant is already processing a query');
            return;
        }

        this.isProcessing = true;

        try {
            this.logger.debug(`Processing assistant query: ${query}`);

            // Check if it's an MCP command (starts with @)
            if (query.trim().startsWith('@')) {
                const mcpResponse = await this.handleMCPCommand(query);
                this.emit('response', {
                    type: 'info',
                    message: mcpResponse
                });
                return;
            }

            const response = await window.yabgo.assistantQuery(query);

            // Handle Perplexity navigation responses
            if (response.type === 'navigate' && response.url) {
                this.logger.info(`Navigating to Perplexity: ${response.url}`);
                // Emit search-mode event to indicate we're in search/Perplexity mode
                this.emit('search-mode', true);
                this.emit('navigate', response.url);
                this.emit('response', response);
                return;
            }

            this.emit('response', response);

            this.logger.debug('Assistant query processed successfully');
        } catch (error) {
            this.logger.error('Error processing assistant query:', error);

            const errorResponse = {
                type: 'error',
                message: 'Sorry, I encountered an error while processing your request.'
            };

            this.emit('response', errorResponse);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get suggestions based on input
     */
    public async getSuggestions(input: string): Promise<string[]> {
        const suggestions = [
            'find rust programming',
            'recent pages',
            'most visited',
            'clear history',
            'search javascript',
            'show statistics'
        ];

        // Add MCP server suggestions if input starts with @
        if (input.startsWith('@')) {
            try {
                const serversResponse = await mcpBridge.getServers();
                if (serversResponse.success && serversResponse.servers) {
                    const mcpSuggestions = serversResponse.servers
                        .filter(s => s.enabled)
                        .map(s => `@${s.name} `);
                    return mcpSuggestions.filter(s =>
                        s.toLowerCase().includes(input.toLowerCase())
                    );
                }
            } catch (error) {
                this.logger.error('Failed to get MCP suggestions:', error);
            }
        }

        const lowerInput = input.toLowerCase();
        return suggestions.filter(suggestion =>
            suggestion.toLowerCase().includes(lowerInput)
        );
    }

    /**
     * Check if query is an assistant command
     */
    public isAssistantCommand(input: string): boolean {
        // MCP commands start with @
        if (input.trim().startsWith('@')) {
            return true;
        }

        const assistantKeywords = [
            'find', 'search', 'recent', 'clear', 'history',
            'visited', 'stats', 'statistics', 'show', 'most'
        ];

        const lowerInput = input.toLowerCase();
        return assistantKeywords.some(keyword => lowerInput.includes(keyword));
    }

    /**
     * Handle MCP tool invocation command
     * Format: @servername toolname params
     * Example: @myserver greet name=Alice
     */
    private async handleMCPCommand(query: string): Promise<string> {
        // Parse MCP command: @servername toolname params
        const mcpMatch = query.trim().match(/@(\S+)\s+(\S+)\s*(.*)/);

        if (!mcpMatch) {
            return 'Invalid MCP command format. Use: @servername toolname [params]\n\nExample: @myserver greet name=Alice';
        }

        const [, serverName, toolName, paramsStr] = mcpMatch;

        try {
            // Find server by name
            const serversResponse = await mcpBridge.getServers();
            if (!serversResponse.success || !serversResponse.servers) {
                return 'Failed to load MCP servers. Please check your configuration.';
            }

            const server = serversResponse.servers.find(s =>
                s.name.toLowerCase() === serverName.toLowerCase()
            );

            if (!server) {
                const availableServers = serversResponse.servers.map(s => s.name).join(', ');
                return `Server '${serverName}' not found.\n\nAvailable servers: ${availableServers || 'none'}`;
            }

            // Parse params (supports key=value or JSON)
            const params = this.parseToolParams(paramsStr);

            // Call tool
            this.logger.info(`Calling MCP tool: ${serverName}.${toolName}`);
            const result = await mcpBridge.callTool({
                serverId: server.id,
                toolName,
                params,
                timestamp: Date.now(),
            });

            if (result.success) {
                return `✓ Tool executed successfully:\n\n${this.formatMCPResult(result.data)}`;
            } else {
                return `✗ Tool execution failed:\n${result.error || 'Unknown error'}`;
            }
        } catch (error) {
            this.logger.error('MCP command error:', error);
            return `Error executing MCP command: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    /**
     * Parse tool parameters from string
     * Supports: key=value pairs or JSON
     */
    private parseToolParams(paramsStr: string): Record<string, unknown> {
        if (!paramsStr || paramsStr.trim().length === 0) {
            return {};
        }

        // Try parsing as JSON first
        try {
            return JSON.parse(paramsStr);
        } catch {
            // Fall back to key=value parsing
            const params: Record<string, string> = {};
            const pairs = paramsStr.split(/\s+/);

            for (const pair of pairs) {
                const [key, ...valueParts] = pair.split('=');
                if (key && valueParts.length > 0) {
                    params[key] = valueParts.join('=');
                }
            }

            return params;
        }
    }

    /**
     * Format MCP tool result for display
     */
    private formatMCPResult(data: unknown): string {
        if (data === null || data === undefined) {
            return '(no result)';
        }

        if (typeof data === 'string') {
            return data;
        }

        if (Array.isArray(data)) {
            // Handle MCP content array format
            return data.map(item => {
                if (typeof item === 'object' && item !== null) {
                    if ('text' in item) {
                        return item.text;
                    }
                    return JSON.stringify(item, null, 2);
                }
                return String(item);
            }).join('\n');
        }

        if (typeof data === 'object') {
            return JSON.stringify(data, null, 2);
        }

        return String(data);
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        this.isProcessing = false;
        this.logger.info('Assistant manager cleanup completed');
    }
}
