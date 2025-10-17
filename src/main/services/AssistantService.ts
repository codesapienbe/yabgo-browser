import { DatabaseManager } from '../managers/DatabaseManager';
import { AssistantResponse } from '../../shared/types/DataTypes';
import { Logger } from '../../shared/utils/Logger';

/**
 * AI Assistant service for processing natural language queries
 */
export class AssistantService {
    private databaseManager: DatabaseManager;
    private logger: Logger;
    private perplexityUrl: string = 'https://www.perplexity.ai';

    constructor(databaseManager: DatabaseManager) {
        this.databaseManager = databaseManager;
        this.logger = new Logger('AssistantService');
    }

    /**
     * Process natural language query and return appropriate response
     */
    public async processQuery(query: string): Promise<AssistantResponse> {
        const lowerQuery = query.toLowerCase().trim();

        this.logger.debug(`Processing query: ${query}`);

        try {
            // Clear history commands
            if (this.matchesPatterns(lowerQuery, ['clear', 'delete', 'remove history'])) {
                return this.handleClearHistory();
            }

            // Recent pages commands
            if (this.matchesPatterns(lowerQuery, ['recent', 'last', 'latest pages'])) {
                return this.handleRecentPages();
            }

            // Most visited commands
            if (this.matchesPatterns(lowerQuery, ['most visited', 'popular', 'top pages', 'frequently visited'])) {
                return this.handleMostVisited();
            }

            // Statistics commands
            if (this.matchesPatterns(lowerQuery, ['stats', 'statistics', 'info', 'summary'])) {
                return this.handleStatistics();
            }

            // Search commands
            if (this.matchesPatterns(lowerQuery, ['find', 'search', 'look for'])) {
                const searchTerm = this.extractSearchTerm(query);
                return this.handleSearch(searchTerm);
            }

            // Default search behavior - use Perplexity for AI queries
            return this.handlePerplexityQuery(query);

        } catch (error) {
            this.logger.error('Error processing query:', error);
            return {
                type: 'error',
                message: 'Sorry, I encountered an error while processing your request.'
            };
        }
    }

    /**
     * Check if query matches any of the given patterns
     */
    private matchesPatterns(query: string, patterns: string[]): boolean {
        return patterns.some(pattern => query.includes(pattern));
    }

    /**
     * Extract search term from commands like "find rust" or "search javascript"
     */
    private extractSearchTerm(query: string): string {
        const searchPrefixes = ['find', 'search', 'look for'];
        const lowerQuery = query.toLowerCase();

        for (const prefix of searchPrefixes) {
            const index = lowerQuery.indexOf(prefix);
            if (index !== -1) {
                return query.substring(index + prefix.length).trim();
            }
        }

        return query.trim();
    }

    /**
     * Handle clear history command
     */
    private handleClearHistory(): AssistantResponse {
        this.databaseManager.clearHistory();
        this.logger.info('History cleared via assistant command');

        return {
            type: 'info',
            message: '✅ Browsing history cleared successfully!'
        };
    }

    /**
     * Handle recent pages query
     */
    private handleRecentPages(): AssistantResponse {
        const recentPages = this.databaseManager.getRecentPages(10);

        return {
            type: 'results',
            title: '📅 Recent Pages',
            items: recentPages
        };
    }

    /**
     * Handle most visited pages query
     */
    private handleMostVisited(): AssistantResponse {
        const mostVisited = this.databaseManager.getMostVisitedPages(10);

        return {
            type: 'results',
            title: '⭐ Most Visited Pages',
            items: mostVisited
        };
    }

    /**
     * Handle statistics query
     */
    private handleStatistics(): AssistantResponse {
        const stats = this.databaseManager.getStatistics();

        return {
            type: 'info',
            message: `📊 Browsing Statistics:\n\n• Total pages visited: ${stats.totalPages}\n• Total visits: ${stats.totalVisits}\n• Average visits per page: ${stats.totalPages > 0 ? (stats.totalVisits / stats.totalPages).toFixed(1) : 0}`
        };
    }

    /**
     * Handle search query
     */
    private handleSearch(query: string): AssistantResponse {
        if (!query.trim()) {
            return {
                type: 'info',
                message: 'Please provide a search term.'
            };
        }

        const results = this.databaseManager.searchPages(query, { limit: 15 });

        return {
            type: 'results',
            title: `🔍 Search Results for "${query}"`,
            items: results
        };
    }

    /**
     * Handle Perplexity AI query
     */
    private handlePerplexityQuery(query: string): AssistantResponse {
        if (!query.trim()) {
            return {
                type: 'info',
                message: 'Please ask a question or provide a search term.'
            };
        }

        // Encode query for URL
        const encodedQuery = encodeURIComponent(query);
        const perplexityQueryUrl = `${this.perplexityUrl}?q=${encodedQuery}`;

        this.logger.info(`Routing query to Perplexity: ${query}`);

        return {
            type: 'navigate',
            url: perplexityQueryUrl,
            message: `🤖 Searching on Perplexity for: "${query}"`
        };
    }

    /**
     * Get Perplexity URL for direct access
     */
    public getPerplexityUrl(): string {
        return this.perplexityUrl;
    }
}
