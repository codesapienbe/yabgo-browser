import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { PageMetadata, HistorySearchOptions } from '../../shared/types/DataTypes';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages SQLite database operations for browsing history and metadata
 */
export class DatabaseManager {
    private db: Database.Database | null = null;
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
            this.db = new Database(this.dbPath);
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
            this.db.close();
            this.db = null;
            this.logger.info('Database connection closed');
        }
    }
}
