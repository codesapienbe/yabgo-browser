import { EventEmitter } from 'events';
import type { PageContext, MCPServerConfig } from '../../types/mcp.types';

/**
 * Manages page context extraction and filtering for MCP servers
 */
export class MCPContextManager extends EventEmitter {
    private currentContext: PageContext | null = null;
    private contextHistory: PageContext[] = [];
    private maxHistorySize = 50;

    constructor() {
        super();
    }

    /**
     * Update current context with permission filtering
     */
    updateContext(context: PageContext, permissions: MCPServerConfig['permissions']): PageContext {
        // Filter context based on permissions
        const filteredContext = this.filterByPermissions(context, permissions);

        this.currentContext = filteredContext;
        this.contextHistory.unshift(filteredContext);

        // Trim history to max size
        if (this.contextHistory.length > this.maxHistorySize) {
            this.contextHistory = this.contextHistory.slice(0, this.maxHistorySize);
        }

        this.emit('context-updated', filteredContext);
        return filteredContext;
    }

    /**
     * Filter context based on server permissions
     */
    private filterByPermissions(
        context: PageContext,
        permissions: MCPServerConfig['permissions']
    ): PageContext {
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
            try {
                const url = new URL(context.url);
                const allowed = permissions.allowedDomains.some(domain =>
                    url.hostname.includes(domain)
                );

                if (!allowed) {
                    filtered.url = '[restricted]';
                    filtered.title = '[restricted]';
                    delete filtered.selection;
                }
            } catch (err) {
                // Invalid URL, restrict it
                filtered.url = '[restricted]';
                filtered.title = '[restricted]';
                delete filtered.selection;
            }
        }

        return filtered;
    }

    /**
     * Get current context
     */
    getCurrentContext(): PageContext | null {
        return this.currentContext;
    }

    /**
     * Get context history with optional limit
     */
    getContextHistory(limit: number = 10): PageContext[] {
        return this.contextHistory.slice(0, limit);
    }

    /**
     * Clear context history
     */
    clearHistory(): void {
        this.contextHistory = [];
        this.emit('history-cleared');
    }

    /**
     * Extract context from raw page data
     */
    extractContext(data: {
        url: string;
        title: string;
        selection?: string;
    }): PageContext {
        return {
            url: data.url || '',
            title: data.title || 'Untitled',
            selection: data.selection,
            timestamp: Date.now(),
        };
    }
}

