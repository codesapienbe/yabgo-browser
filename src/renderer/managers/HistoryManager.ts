import { EventEmitter } from '../utils/EventEmitter';
import { Logger } from '../../shared/utils/Logger';
import { PageMetadata } from '../../shared/types/DataTypes';

/**
 * Manages browsing history in renderer process
 */
export class HistoryManager extends EventEmitter {
    private localHistory: string[] = [];
    private logger: Logger;

    constructor() {
        super();
        this.logger = new Logger('HistoryManager');
    }

    /**
     * Initialize history manager
     */
    public async initialize(): Promise<void> {
        await this.loadHistory();
        this.logger.info('History manager initialized');
    }

    /**
     * Load history from database
     */
    private async loadHistory(): Promise<void> {
        try {
            const history = await window.yabgo.getHistory(50);
            this.localHistory = history.map(item => item.url);
            this.logger.debug(`Loaded ${history.length} history items`);
        } catch (error) {
            this.logger.error('Error loading history:', error);
        }
    }

    /**
     * Add URL to local history
     */
    public addToHistory(url: string): void {
        // Avoid duplicates at the top
        const existingIndex = this.localHistory.indexOf(url);
        if (existingIndex !== -1) {
            this.localHistory.splice(existingIndex, 1);
        }

        this.localHistory.unshift(url);

        // Keep only last 100 items in memory
        if (this.localHistory.length > 100) {
            this.localHistory = this.localHistory.slice(0, 100);
        }

        this.emit('history-updated', url);
        this.logger.debug(`Added to local history: ${url}`);
    }

    /**
     * Get recent URLs
     */
    public getRecentURLs(limit: number = 10): string[] {
        return this.localHistory.slice(0, limit);
    }

    /**
     * Search local history
     */
    public searchLocal(query: string): string[] {
        const lowerQuery = query.toLowerCase();
        return this.localHistory.filter(url => 
            url.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get database statistics
     */
    public async getStatistics(): Promise<{ totalPages: number; totalVisits: number }> {
        try {
            return await window.yabgo.getStatistics();
        } catch (error) {
            this.logger.error('Error getting statistics:', error);
            return { totalPages: 0, totalVisits: 0 };
        }
    }

    /**
     * Clear all history
     */
    public clearHistory(): void {
        this.localHistory = [];
        this.emit('history-cleared');
        this.logger.info('Local history cleared');
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        this.localHistory = [];
        this.logger.info('History manager cleanup completed');
    }
}
