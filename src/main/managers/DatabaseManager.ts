import * as path from 'path';
import { app } from 'electron';
import { PageMetadata, HistorySearchOptions } from '../../shared/types/DataTypes';
import { Logger } from '../../shared/utils/Logger';

/**
 * Minimal in-memory fallback DB that mimics the subset of better-sqlite3 used by DatabaseManager.
 * This is only used when the native better-sqlite3 cannot be loaded (for example in Jest test envs).
 */
class InMemoryDB {
    private rows: PageMetadata[] = [];

    public exec(_sql: string): void {
        // No-op for table/index creation statements
    }

    public prepare(sql: string) {
        const normalized = sql.trim().toLowerCase();

        if (normalized.startsWith('insert into page_metadata')) {
            return {
                run: (url: string, title: string, description: string, keywords: string, content_snippet: string, visit_timestamp: string, favicon_url: string) => {
                    const now = new Date().toISOString();
                    const existing = this.rows.find(r => r.url === url);
                    if (existing) {
                        existing.title = title || existing.title;
                        existing.description = description || existing.description || '';
                        existing.keywords = keywords || existing.keywords || '';
                        existing.content_snippet = content_snippet || existing.content_snippet;
                        existing.visit_timestamp = visit_timestamp || existing.visit_timestamp;
                        existing.favicon_url = favicon_url || existing.favicon_url || '';
                        existing.visit_count = (existing.visit_count || 1) + 1;
                        existing.updated_at = now;
                        return { changes: 1 };
                    } else {
                        const newRow: PageMetadata & { id?: number; created_at?: string; updated_at?: string; visit_count?: number } = {
                            url,
                            title: title || '',
                            description: description || '',
                            keywords: keywords || '',
                            content_snippet: content_snippet || '',
                            visit_timestamp: visit_timestamp || now,
                            visit_count: 1,
                            favicon_url: favicon_url || '',
                            created_at: now,
                            updated_at: now
                        };
                        this.rows.push(newRow as PageMetadata);
                        return { changes: 1 };
                    }
                }
            };
        }

        if (normalized.startsWith('select * from page_metadata') && normalized.includes('where')) {
            // searchPages
            return {
                all: (a: string, _b: string, _c: string, _d: string, limit: number) => {
                    const extract = (pattern: string) => pattern.replace(/%/g, '').toLowerCase();
                    const q = extract(a || '');
                    const results = this.rows.filter(r => {
                        const t = (r.title || '').toLowerCase();
                        const desc = (r.description || '').toLowerCase();
                        const snippet = (r.content_snippet || '').toLowerCase();
                        const url = (r.url || '').toLowerCase();
                        return t.includes(q) || desc.includes(q) || snippet.includes(q) || url.includes(q);
                    });

                    results.sort((x, y) => {
                        const vx = x.visit_count || 0;
                        const vy = y.visit_count || 0;
                        if (vy !== vx) return vy - vx;
                        const tx = x.visit_timestamp || '';
                        const ty = y.visit_timestamp || '';
                        return ty.localeCompare(tx);
                    });

                    return results.slice(0, limit);
                }
            };
        }

        if (normalized.startsWith('select * from page_metadata') && normalized.includes('order by visit_timestamp')) {
            return {
                all: (limit: number) => {
                    const results = [...this.rows].sort((a, b) => (b.visit_timestamp || '').localeCompare(a.visit_timestamp || ''));
                    return results.slice(0, limit);
                }
            };
        }

        if (normalized.startsWith('select * from page_metadata') && normalized.includes('order by visit_count')) {
            return {
                all: (limit: number) => {
                    const results = [...this.rows].sort((a, b) => {
                        const dv = (b.visit_count || 0) - (a.visit_count || 0);
                        if (dv !== 0) return dv;
                        return (b.visit_timestamp || '').localeCompare(a.visit_timestamp || '');
                    });
                    return results.slice(0, limit);
                }
            };
        }

        if (normalized.startsWith('delete from page_metadata')) {
            return {
                run: () => {
                    const changes = this.rows.length;
                    this.rows = [];
                    return { changes };
                }
            };
        }

        if (normalized.startsWith('select count(*)')) {
            return {
                get: () => ({ count: this.rows.length })
            };
        }

        if (normalized.startsWith('select sum(visit_count)')) {
            return {
                get: () => ({ count: this.rows.reduce((s, r) => s + (r.visit_count || 0), 0) })
            };
        }

        // Default fallback: return no-op methods
        return {
            run: () => ({ changes: 0 }),
            get: () => undefined,
            all: () => []
        };
    }

    public close(): void {
        // No-op
    }
}

/**
 * Manages SQLite database operations for browsing history and metadata
 */
export class DatabaseManager {
    private db: any | null = null;
    private logger: Logger;
    private readonly dbPath: string;

    constructor() {
        this.logger = new Logger('DatabaseManager');
        this.dbPath = path.join(app.getPath('userData'), 'yabgo_history.db');
    }

    /**
     * Initialize database connection and create tables
     */
    public async initialize(): Promise<void> {
        try {
            try {
                // Try to load native better-sqlite3 at runtime
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const BetterSqlite3 = require('better-sqlite3');
                this.db = new BetterSqlite3(this.dbPath);
            } catch (err) {
                // Native addon failed to load (common in test environments) - use in-memory fallback
                this.logger.error('Failed to initialize native better-sqlite3, using in-memory fallback:', err);
                this.db = new InMemoryDB();
            }

            this.createTables();
            this.logger.info(`Database initialized at: ${this.dbPath}`);
        } catch (error) {
            this.logger.error('Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Create database tables
     */
    private createTables(): void {
        if (!this.db) throw new Error('Database not initialized');

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS page_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                keywords TEXT,
                content_snippet TEXT NOT NULL,
                visit_timestamp TEXT NOT NULL,
                visit_count INTEGER DEFAULT 1,
                favicon_url TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_url ON page_metadata(url);
            CREATE INDEX IF NOT EXISTS idx_timestamp ON page_metadata(visit_timestamp);
            CREATE INDEX IF NOT EXISTS idx_visit_count ON page_metadata(visit_count);
            CREATE INDEX IF NOT EXISTS idx_title ON page_metadata(title);
        `;

        this.db.exec(createTableSQL);
        this.logger.info('Database tables created successfully');
        // Initialize MCP tables for Phase 1
        this.initializeMCPTables();
    }

    private initializeMCPTables(): void {
        if (!this.db) throw new Error('Database not initialized');

        const mcpSQL = `
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
        `;

        this.db.exec(mcpSQL);
        this.logger.info('MCP tables created successfully');
    }

    /**
     * Insert or update page metadata
     */
    public insertOrUpdateMetadata(metadata: PageMetadata): void {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            INSERT INTO page_metadata 
            (url, title, description, keywords, content_snippet, visit_timestamp, visit_count, favicon_url, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP) 
            ON CONFLICT(url) DO UPDATE SET 
                title = excluded.title,
                description = excluded.description,
                keywords = excluded.keywords,
                content_snippet = excluded.content_snippet,
                visit_timestamp = excluded.visit_timestamp,
                visit_count = visit_count + 1,
                favicon_url = excluded.favicon_url,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(
            metadata.url,
            metadata.title,
            metadata.description || '',
            metadata.keywords || '',
            metadata.content_snippet,
            metadata.visit_timestamp,
            metadata.favicon_url || ''
        );

        this.logger.debug(`Metadata saved for URL: ${metadata.url}`);
    }

    /**
     * Search pages by query
     */
    public searchPages(query: string, options: HistorySearchOptions = {}): PageMetadata[] {
        if (!this.db) throw new Error('Database not initialized');

        const limit = options.limit || 10;
        const searchPattern = `%${query}%`;

        const stmt = this.db.prepare(`
            SELECT * FROM page_metadata 
            WHERE title LIKE ? OR description LIKE ? OR content_snippet LIKE ? OR url LIKE ? 
            ORDER BY visit_count DESC, visit_timestamp DESC 
            LIMIT ?
        `);

        const results = stmt.all(searchPattern, searchPattern, searchPattern, searchPattern, limit) as PageMetadata[];
        this.logger.debug(`Found ${results.length} results for query: ${query}`);

        return results;
    }

    /**
     * Get recent pages
     */
    public getRecentPages(limit: number = 10): PageMetadata[] {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT * FROM page_metadata 
            ORDER BY visit_timestamp DESC 
            LIMIT ?
        `);

        const results = stmt.all(limit) as PageMetadata[];
        this.logger.debug(`Retrieved ${results.length} recent pages`);

        return results;
    }

    /**
     * Get most visited pages
     */
    public getMostVisitedPages(limit: number = 10): PageMetadata[] {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            SELECT * FROM page_metadata 
            ORDER BY visit_count DESC, visit_timestamp DESC 
            LIMIT ?
        `);

        const results = stmt.all(limit) as PageMetadata[];
        this.logger.debug(`Retrieved ${results.length} most visited pages`);

        return results;
    }

    /**
     * Clear all history
     */
    public clearHistory(): void {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare('DELETE FROM page_metadata');
        const result = stmt.run();

        this.logger.info(`Cleared ${result.changes} history entries`);
    }

    // MCP-related DB methods (Phase 1)
    public saveMCPServer(config: any): void {
        if (!this.db) throw new Error('Database not initialized');

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

    public getMCPServers(): any[] {
        if (!this.db) throw new Error('Database not initialized');

        const rows = this.db.prepare('SELECT config FROM mcp_servers WHERE 1=1').all();
        return rows.map((row: any) => JSON.parse(row.config));
    }

    public deleteMCPServer(serverId: string): void {
        if (!this.db) throw new Error('Database not initialized');

        this.db.prepare('DELETE FROM mcp_servers WHERE id = ?').run(serverId);
        this.db.prepare('DELETE FROM mcp_tool_history WHERE server_id = ?').run(serverId);
    }

    public saveMCPToolCall(serverId: string, toolCall: any, result: any): void {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = this.db.prepare(`
            INSERT INTO mcp_tool_history (server_id, tool_name, params, result, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `);

        stmt.run(
            serverId,
            toolCall.toolName,
            JSON.stringify(toolCall.params || {}),
            JSON.stringify(result || {}),
            toolCall.timestamp || Date.now()
        );
    }

    public getMCPToolHistory(serverId: string, limit: number = 50): any[] {
        if (!this.db) throw new Error('Database not initialized');

        return this.db.prepare(`
            SELECT * FROM mcp_tool_history 
            WHERE server_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `).all(serverId, limit);
    }

    /**
     * Get database statistics
     */
    public getStatistics(): { totalPages: number; totalVisits: number } {
        if (!this.db) throw new Error('Database not initialized');

        const totalPagesStmt = this.db.prepare('SELECT COUNT(*) as count FROM page_metadata');
        const totalVisitsStmt = this.db.prepare('SELECT SUM(visit_count) as count FROM page_metadata');

        const totalPages = (totalPagesStmt.get() as { count: number }).count;
        const totalVisits = (totalVisitsStmt.get() as { count: number }).count || 0;

        return { totalPages, totalVisits };
    }

    /**
     * Close database connection
     */
    public close(): void {
        if (this.db) {
            try {
                this.db.close();
            } catch {
                // ignore close errors for fallback
            }
            this.db = null;
            this.logger.info('Database connection closed');
        }
    }
}
