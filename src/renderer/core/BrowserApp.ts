import { NavigationManager } from '../managers/NavigationManager';
import { GestureManager } from '../managers/GestureManager';
import { UIManager } from '../managers/UIManager';
import { AssistantManager } from '../managers/AssistantManager';
import { HistoryManager } from '../managers/HistoryManager';
import { Logger } from '../../shared/utils/Logger';

/**
 * Main browser application class for a renderer process
 */
export class BrowserApp {
    private readonly navigationManager: NavigationManager;
    private gestureManager: GestureManager;
    private readonly uiManager: UIManager;
    private assistantManager: AssistantManager;
    private readonly historyManager: HistoryManager;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('BrowserApp');

        // Initialize managers
        this.navigationManager = new NavigationManager();
        this.gestureManager = new GestureManager(this.navigationManager);
        this.uiManager = new UIManager();
        this.historyManager = new HistoryManager();
        this.assistantManager = new AssistantManager(this.historyManager);
    }

    /**
     * Initialize the browser application
     */
    public async initialize(): Promise<void> {
        try {
            // Initialize all managers
            await this.navigationManager.initialize();
            await this.gestureManager.initialize();
            await this.uiManager.initialize();
            await this.assistantManager.initialize();
            await this.historyManager.initialize();

            // Setup inter-manager communication
            this.setupManagerCommunication();

            this.logger.info('Browser application initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize browser application:', error);
            throw error;
        }
    }

    /**
     * Setup communication between managers
     */
    private setupManagerCommunication(): void {
        // Navigation events
        this.navigationManager.on('navigation', (url: string) => {
            this.historyManager.addToHistory(url);
            this.uiManager.updateAddressBar(url);
        });

        // UI events
        this.uiManager.on('navigate', (input: string) => {
            this.navigationManager.navigate(input);
        });

        this.uiManager.on('assistant-query', (query: string) => {
            this.assistantManager.processQuery(query);
        });

        // Assistant events
        this.assistantManager.on('response', (response: any) => {
            this.uiManager.displayAssistantResponse(response);
        });

        this.assistantManager.on('navigate', (url: string) => {
            this.navigationManager.navigate(url);
            this.uiManager.hideAssistantResponse();
        });

        // Gesture events
        this.gestureManager.on('back', () => this.navigationManager.goBack());
        this.gestureManager.on('forward', () => this.navigationManager.goForward());
        this.gestureManager.on('refresh', () => this.navigationManager.refresh());
        this.gestureManager.on('scroll-top', () => this.navigationManager.scrollToTop());

        this.logger.debug('Manager communication setup completed');
    }

    /**
     * Get navigation manager
     */
    public getNavigationManager(): NavigationManager {
        return this.navigationManager;
    }

    /**
     * Get UI manager
     */
    public getUIManager(): UIManager {
        return this.uiManager;
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        this.gestureManager.cleanup();
        this.uiManager.cleanup();
        this.assistantManager.cleanup();
        this.historyManager.cleanup();
        this.navigationManager.cleanup();

        this.logger.info('Browser application cleanup completed');
    }
}
