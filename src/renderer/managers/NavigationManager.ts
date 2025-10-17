import { EventEmitter } from '../utils/EventEmitter';
import { URLHelper } from '../../shared/utils/URLHelper';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages browser navigation and webview interactions
 */
export class NavigationManager extends EventEmitter {
    private history: string[] = [];
    private currentIndex: number = -1;
    private logger: Logger;

    constructor() {
        super();
        this.logger = new Logger('NavigationManager');
    }

    /**
     * Initialize navigation manager
     */
    public async initialize(): Promise<void> {
        this.logger.info('Navigation manager initialized');
    }

    /**
     * Set the active tab manager reference
     */
    public setActiveTab(tabId: string): void {
        // This method can be used to track the active tab for navigation
        this.logger.debug(`Active tab set to: ${tabId}`);
    }


    /**
     * Navigate to URL or process search query
     */
    public navigate(input: string): void {
        const url = URLHelper.processInput(input);

        this.addToHistory(url);
        this.emit('navigation', url);

        this.logger.info(`Navigating to: ${url}`);
    }

    /**
     * Add URL to navigation history
     */
    public addToHistory(url: string): void {
        // Remove items after current index
        this.history = this.history.slice(0, this.currentIndex + 1);
        this.history.push(url);
        this.currentIndex = this.history.length - 1;

        this.logger.debug(`Added to history: ${url}`);
    }

    /**
     * Go back in history
     */
    public goBack(): boolean {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const url = this.history[this.currentIndex];

            this.emit('navigation', url);
            this.logger.debug(`Navigated back to: ${url}`);
            return true;
        }

        return false;
    }

    /**
     * Go forward in history
     */
    public goForward(): boolean {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            const url = this.history[this.currentIndex];

            this.emit('navigation', url);
            this.logger.debug(`Navigated forward to: ${url}`);
            return true;
        }

        return false;
    }

    /**
     * Refresh current page
     */
    public refresh(): void {
        this.logger.debug('Page refreshed');
    }

    /**
     * Scroll to top of page
     */
    public scrollToTop(): void {
        this.logger.debug('Scrolled to top');
    }

    /**
     * Load default homepage
     */
    public loadDefaultPage(): void {
        // Intentionally left empty to keep homepage as about:blank
        this.logger.info('Default page left empty');
    }

    /**
     * Get current URL (placeholder for future implementation)
     */
    public getCurrentURL(): string | null {
        return null;
    }

    /**
     * Check if can go back
     */
    public canGoBack(): boolean {
        return this.currentIndex > 0;
    }

    /**
     * Check if can go forward
     */
    public canGoForward(): boolean {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Cleanup navigation manager
     */
    public cleanup(): void {
        this.history = [];
        this.currentIndex = -1;
        this.logger.info('Navigation manager cleaned up');
    }
}
