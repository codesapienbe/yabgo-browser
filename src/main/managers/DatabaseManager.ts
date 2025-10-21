import { PageMetadata, HistorySearchOptions } from '../../shared/types/DataTypes';
import { Logger } from '../../shared/utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

/**
 * Lightweight in-memory DatabaseManager with optional file-based persistence for MCP servers.
 * Replaces the SQLite-backed implementation with memory-only storage by default.
 * When the environment variable `YABGO_PERSIST_MCP_SERVERS` is set to '1' or 'true',
 * the manager will load and persist `mcp_servers.json` in the Electron userData directory.
 * Keeps the same public API so the rest of the app can use it without changes.
 */
export class DatabaseManager {
    private logger: Logger;
    private pages: Map<string, PageMetadata> = new Map();
    private mcpServers: Map<string, any> = new Map();
    private mcpToolHistory: Array<{ server_id: string; tool_name: string; params: any; result: any; timestamp: number }> = [];
    private readonly persist: boolean = false;
    private readonly persistPath: string | null = null;
    private readonly persistToolHistoryPath: string | null = null;

    constructor() {
        this.logger = new Logger('DatabaseManager');

        // Optional persistence is opt-in via environment variable
        const envVal = process.env.YABGO_PERSIST_MCP_SERVERS;
        this.persist = envVal === '1' || (envVal || '').toLowerCase() === 'true';
        if (this.persist) {
            try {
                const userData = app.getPath('userData');
                this.persistPath = path.join(userData, 'mcp_servers.json');
                this.persistToolHistoryPath = path.join(userData, 'mcp_tool_history.json');
            } catch (err) {
                this.logger.warn('Failed to determine userData path for MCP persistence; disabling persistence', err);
                this.persist = false;
                this.persistPath = null;
                this.persistToolHistoryPath = null;
            }
        }
    }

    /**
     * Initialize (load persisted servers if enabled)
     */
    public async initialize(): Promise<void> {
        // No native modules or file DB to initialize. Keep parity with the previous API.
        if (this.persist && this.persistPath) {
            this.loadPersistedServers();
            this.loadPersistedToolHistory();
        }
        this.logger.info('Initialized in-memory database (no persistent storage)');
    }

    private loadPersistedServers(): void {
        if (!this.persistPath) return;
        try {
            if (!fs.existsSync(this.persistPath)) return;
            const raw = fs.readFileSync(this.persistPath, 'utf8');
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
                for (const s of arr) {
                    if (s && s.id) this.mcpServers.set(s.id, s);
                }
                this.logger.info(`Loaded ${this.mcpServers.size} persisted MCP server(s) from disk`);
            }
        } catch (err) {
            this.logger.warn('Failed to load persisted MCP servers:', err);
        }
    }

    private loadPersistedToolHistory(): void {
        if (!this.persistToolHistoryPath) return;
        try {
            if (!fs.existsSync(this.persistToolHistoryPath)) return;
            const raw = fs.readFileSync(this.persistToolHistoryPath, 'utf8');
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
                // Keep only well-formed entries
                this.mcpToolHistory = arr.filter((h: any) => h && h.server_id && h.timestamp).map((h: any) => ({
                    server_id: h.server_id,
                    tool_name: h.tool_name,
                    params: h.params || {},
                    result: h.result || {},
                    timestamp: h.timestamp || Date.now(),
                }));
                this.logger.info(`Loaded ${this.mcpToolHistory.length} persisted MCP tool history entries from disk`);
            }
        } catch (err) {
            this.logger.warn('Failed to load persisted MCP tool history:', err);
        }
    }

    private persistServersToDisk(): void {
        if (!this.persist || !this.persistPath) return;
        try {
            const arr = Array.from(this.mcpServers.values());
            const tmp = `${this.persistPath}.tmp`;
            fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), { mode: 0o600 });
            fs.renameSync(tmp, this.persistPath);
            this.logger.debug(`Persisted ${arr.length} MCP server(s) to disk`);
        } catch (err) {
            this.logger.warn('Failed to persist MCP servers to disk:', err);
        }
    }

    private persistToolHistoryToDisk(): void {
        if (!this.persist || !this.persistToolHistoryPath) return;
        try {
            const arr = this.mcpToolHistory.slice();
            const tmp = `${this.persistToolHistoryPath}.tmp`;
            fs.writeFileSync(tmp, JSON.stringify(arr, null, 2), { mode: 0o600 });
            fs.renameSync(tmp, this.persistToolHistoryPath);
            this.logger.debug(`Persisted ${arr.length} MCP tool history entries to disk`);
        } catch (err) {
            this.logger.warn('Failed to persist MCP tool history to disk:', err);
        }
    }

    /**
     * Insert or update page metadata. Uses URL as unique key.
     */
    public insertOrUpdateMetadata(metadata: PageMetadata): void {
        const nowStr = new Date().toISOString();
        const existing = this.pages.get(metadata.url);
        if (existing) {
            // Update fields and bump visit_count
            existing.title = metadata.title || existing.title;
            existing.description = metadata.description ?? existing.description;
            existing.keywords = metadata.keywords ?? existing.keywords;
            existing.content_snippet = metadata.content_snippet || existing.content_snippet;
            existing.visit_timestamp = metadata.visit_timestamp || nowStr;
            existing.visit_count = (existing.visit_count || 0) + 1;
            existing.favicon_url = metadata.favicon_url || existing.favicon_url;
            // keep createdAt if present
            this.pages.set(metadata.url, existing);
        } else {
            const toSave: PageMetadata = {
                url: metadata.url,
                title: metadata.title || 'Untitled',
                description: metadata.description || '',
                keywords: metadata.keywords || '',
                content_snippet: metadata.content_snippet || '',
                visit_timestamp: metadata.visit_timestamp || nowStr,
                visit_count: metadata.visit_count || 1,
                favicon_url: metadata.favicon_url || '',
            } as PageMetadata;

            this.pages.set(metadata.url, toSave);
        }

        this.logger.debug(`Metadata saved for URL: ${metadata.url}`);
    }

    /**
     * Search pages by query (simple substring match in a few fields)
     */
    public searchPages(query: string, options: HistorySearchOptions = {}): PageMetadata[] {
        const limit = options.limit || 10;
        const q = (query || '').toLowerCase();

        const results = Array.from(this.pages.values()).filter(p => {
            return (
                (p.title || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q) ||
                (p.content_snippet || '').toLowerCase().includes(q) ||
                (p.url || '').toLowerCase().includes(q)
            );
        });

        results.sort((a, b) => {
            const byCount = (b.visit_count || 0) - (a.visit_count || 0);
            if (byCount !== 0) return byCount;
            const ta = Date.parse(a.visit_timestamp || '') || 0;
            const tb = Date.parse(b.visit_timestamp || '') || 0;
            return tb - ta;
        });

        this.logger.debug(`Found ${Math.min(results.length, limit)} results for query: ${query}`);
        return results.slice(0, limit);
    }

    /**
     * Get recent pages
     */
    public getRecentPages(limit: number = 10): PageMetadata[] {
        const results = Array.from(this.pages.values()).sort((a, b) => {
            const ta = Date.parse(a.visit_timestamp || '') || 0;
            const tb = Date.parse(b.visit_timestamp || '') || 0;
            return tb - ta;
        });
        this.logger.debug(`Retrieved ${Math.min(results.length, limit)} recent pages`);
        return results.slice(0, limit);
    }

    /**
     * Get most visited pages
     */
    public getMostVisitedPages(limit: number = 10): PageMetadata[] {
        const results = Array.from(this.pages.values()).sort((a, b) => {
            const byCount = (b.visit_count || 0) - (a.visit_count || 0);
            if (byCount !== 0) return byCount;
            const ta = Date.parse(a.visit_timestamp || '') || 0;
            const tb = Date.parse(b.visit_timestamp || '') || 0;
            return tb - ta;
        });
        this.logger.debug(`Retrieved ${Math.min(results.length, limit)} most visited pages`);
        return results.slice(0, limit);
    }

    /**
     * Clear all history
     */
    public clearHistory(): void {
        const count = this.pages.size;
        this.pages.clear();
        this.logger.info(`Cleared ${count} history entries`);
    }

    // MCP-related in-memory methods
    public saveMCPServer(config: any): void {
        // Ensure minimal default fields
        const cfg = {
            id: config.id,
            name: config.name,
            command: config.command,
            args: config.args ?? [],
            env: config.env ?? undefined,
            supervise: config.supervise ?? false,
            cwd: config.cwd ?? undefined,
            enabled: config.enabled ?? true,
            permissions: config.permissions ?? (config.permissions ?? {}),
            createdAt: config.createdAt ?? Date.now(),
            lastUsed: config.lastUsed ?? null,
        };

        this.mcpServers.set(cfg.id, cfg);
        // Persist to disk when enabled
        if (this.persist) this.persistServersToDisk();
    }

    public getMCPServers(): any[] {
        return Array.from(this.mcpServers.values());
    }

    public deleteMCPServer(serverId: string): void {
        this.mcpServers.delete(serverId);
        this.mcpToolHistory = this.mcpToolHistory.filter(h => h.server_id !== serverId);
        if (this.persist) this.persistServersToDisk();
        if (this.persist) this.persistToolHistoryToDisk();
    }

    public saveMCPToolCall(serverId: string, toolCall: any, result: any): void {
        this.mcpToolHistory.push({
            server_id: serverId,
            tool_name: toolCall.toolName,
            params: toolCall.params || {},
            result: result || {},
            timestamp: toolCall.timestamp || Date.now(),
        });
        if (this.persist) this.persistToolHistoryToDisk();
    }

    public getMCPToolHistory(serverId: string, limit: number = 50): any[] {
        const rows = this.mcpToolHistory.filter(h => h.server_id === serverId).sort((a, b) => b.timestamp - a.timestamp);
        return rows.slice(0, limit);
    }

    /**
     * Get database statistics
     */
    public getStatistics(): { totalPages: number; totalVisits: number } {
        const totalPages = this.pages.size;
        const totalVisits = Array.from(this.pages.values()).reduce((acc, p) => acc + (p.visit_count || 0), 0);
        return { totalPages, totalVisits };
    }

    /**
     * Close (clear in-memory store)
     */
    public close(): void {
        this.pages.clear();
        this.mcpServers.clear();
        this.mcpToolHistory = [];
        this.logger.info('In-memory database cleared');
        // Persist final state before exit if persistence enabled
        if (this.persist) {
            this.persistServersToDisk();
            this.persistToolHistoryToDisk();
        }
    }
}
