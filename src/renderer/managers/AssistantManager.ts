import { EventEmitter } from '../utils/EventEmitter';
import { HistoryManager } from './HistoryManager';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages assistant interactions in renderer process
 */
export class AssistantManager extends EventEmitter {
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

            const response = await window.yabgo.assistantQuery(query);
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
    public getSuggestions(input: string): string[] {
        const suggestions = [
            'find rust programming',
            'recent pages',
            'most visited',
            'clear history',
            'search javascript',
            'show statistics'
        ];

        const lowerInput = input.toLowerCase();
        return suggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(lowerInput)
        );
    }

    /**
     * Check if query is an assistant command
     */
    public isAssistantCommand(input: string): boolean {
        const assistantKeywords = [
            'find', 'search', 'recent', 'clear', 'history', 
            'visited', 'stats', 'statistics', 'show', 'most'
        ];

        const lowerInput = input.toLowerCase();
        return assistantKeywords.some(keyword => lowerInput.includes(keyword));
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        this.isProcessing = false;
        this.logger.info('Assistant manager cleanup completed');
    }
}
