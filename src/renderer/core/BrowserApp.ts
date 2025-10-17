import { NavigationManager } from '../managers/NavigationManager';
import { GestureManager } from '../managers/GestureManager';
import { UIManager } from '../managers/UIManager';
import { AssistantManager } from '../managers/AssistantManager';
import { HistoryManager } from '../managers/HistoryManager';
import { TabManager } from '../managers/TabManager';
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
    private readonly tabManager: TabManager;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('BrowserApp');

        // Initialize managers
        this.navigationManager = new NavigationManager();
        this.gestureManager = new GestureManager(this.navigationManager);
        this.uiManager = new UIManager();
        this.historyManager = new HistoryManager();
        this.tabManager = new TabManager();
        this.assistantManager = new AssistantManager(this.historyManager);
    }

    /**
     * Initialize the browser application
     */
    public async initialize(): Promise<void> {
        try {
            // Initialize all managers
            await this.tabManager.initialize();
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
        // Tab events
        this.tabManager.on('tab-created', (tab: any) => {
            this.logger.debug(`Tab created: ${tab.id}`);
            // Restore and auto-focus input when new tab is created
            this.uiManager.restoreInput();
            this.uiManager.focusInput();
        });

        this.tabManager.on('tab-switched', (tab: any) => {
            this.logger.debug(`Tab switched: ${tab.id}`);
            // Update navigation manager with current tab
            this.navigationManager.setActiveTab(tab.id);
            // Restore input unless reader preference is enabled for this site
            try {
                const site = new URL(tab.url || '').hostname;
                const prefs = JSON.parse(localStorage.getItem('readerPrefs') || '{}');
                if (!prefs[site]) {
                    this.uiManager.restoreInput();
                }
            } catch (e) {
                this.uiManager.restoreInput();
            }
        });

        this.tabManager.on('tab-closed', (tabId: string) => {
            this.logger.debug(`Tab closed: ${tabId}`);
        });

        this.tabManager.on('tab-updated', (tab: any) => {
            // Hide loading when page finishes loading
            if (!tab.isLoading) {
                this.uiManager.hideLoading();
            }
        });

        // Navigation events
        this.navigationManager.on('navigation', (url: string) => {
            this.historyManager.addToHistory(url);
            this.uiManager.updateAddressBar(url);

            // Exit search mode if navigating to a non-Perplexity URL
            if (this.uiManager.isInSearchMode() && !url.includes('perplexity.ai')) {
                this.uiManager.setSearchMode(false);
            }

            // Update current tab URL
            const activeTab = this.tabManager.getActiveTab();
            if (activeTab) {
                this.tabManager.updateTab(activeTab.id, { url });
            }
        });

        // UI events
        this.uiManager.on('navigate', (input: string) => {
            this.tabManager.navigate(input);
        });

        this.uiManager.on('assistant-query', (query: string) => {
            this.assistantManager.processQuery(query);
        });

        // Assistant events
        this.assistantManager.on('response', (response: any) => {
            this.uiManager.displayAssistantResponse(response);
        });

        this.assistantManager.on('navigate', (url: string) => {
            this.tabManager.navigate(url);
            this.uiManager.hideAssistantResponse();
        });

        this.assistantManager.on('search-mode', (enabled: boolean) => {
            this.uiManager.setSearchMode(enabled);
        });

        // Reader toggle
        const readerToggle = document.getElementById('readerToggle');
        readerToggle?.addEventListener('click', async () => {
            const activeTab = this.tabManager.getActiveTab();
            if (activeTab) {
                await this.tabManager.toggleReader(activeTab.id);
            }
        });

        // Keyboard shortcut: Ctrl/Cmd + Shift + R to toggle reader
        document.addEventListener('keydown', async (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const modifier = isMac ? e.metaKey : e.ctrlKey;
            if (modifier && e.shiftKey && e.key.toLowerCase() === 'r') {
                const activeTab = this.tabManager.getActiveTab();
                if (activeTab) {
                    await this.tabManager.toggleReader(activeTab.id);
                }
            }
        });

        // Persist reader-mode preference per site when TabManager emits reader-mode
        this.tabManager.on('reader-mode', (_tabId: string, enabled: boolean) => {
            const tab = this.tabManager.getActiveTab();
            if (!tab) return;
            const url = tab.url || '';
            try {
                const site = new URL(url).hostname;
                const prefs = JSON.parse(localStorage.getItem('readerPrefs') || '{}');
                prefs[site] = enabled;
                localStorage.setItem('readerPrefs', JSON.stringify(prefs));
            } catch (e) {
                // ignore invalid URL
            }
        });

        // On tab switch, auto-enter reader mode if preference exists
        this.tabManager.on('tab-switched', (tab: any) => {
            try {
                const site = new URL(tab.url || '').hostname;
                const prefs = JSON.parse(localStorage.getItem('readerPrefs') || '{}');
                if (prefs[site]) {
                    this.tabManager.toggleReader(tab.id);
                }
            } catch (e) { }
        });

        // TabManager emits reader-content when markdown is ready
        this.tabManager.on('reader-content', (_tabId: string, markdown: string) => {
            this.uiManager.showReader(markdown);
        });

        // TabManager emits reader-mode when toggled
        this.tabManager.on('reader-mode', (_tabId: string, enabled: boolean) => {
            if (!enabled) {
                this.uiManager.hideReader();
                this.uiManager.restoreInput();
            }
        });

        // Gesture events
        this.gestureManager.on('back', () => this.tabManager.goBack());
        this.gestureManager.on('forward', () => this.tabManager.goForward());
        this.gestureManager.on('refresh', () => this.tabManager.refresh());
        this.gestureManager.on('scroll-top', () => this.tabManager.scrollToTop());

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
     * Get tab manager
     */
    public getTabManager(): TabManager {
        return this.tabManager;
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
        this.tabManager.cleanup();

        this.logger.info('Browser application cleanup completed');
    }
}
