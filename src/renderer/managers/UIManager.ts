import { EventEmitter } from '../utils/EventEmitter';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages UI interactions and state
 */
export class UIManager extends EventEmitter {
    private unifiedInput: HTMLInputElement | null = null;
    private inputBtn: HTMLButtonElement | null = null;
    private inputContainer: HTMLElement | null = null;
    private floatingButton: HTMLElement | null = null;
    private assistantResponse: HTMLElement | null = null;

    private isScrolling: boolean = false;
    private scrollTimeout: number | null = null;
    private logger: Logger;

    constructor() {
        super();
        this.logger = new Logger('UIManager');
    }

    /**
     * Initialize UI manager
     */
    public async initialize(): Promise<void> {
        this.findElements();
        this.setupEventListeners();
        this.setupWindowControls();
        this.autoFocusSearchField();

        this.logger.info('UI manager initialized');
    }

    /**
     * Find DOM elements
     */
    private findElements(): void {
        this.unifiedInput = document.getElementById('unifiedInput') as HTMLInputElement;
        this.inputBtn = document.getElementById('inputBtn') as HTMLButtonElement;
        this.inputContainer = document.getElementById('inputContainer') as HTMLElement;
        this.floatingButton = document.getElementById('floatingButton') as HTMLElement;
        this.assistantResponse = document.getElementById('assistantResponse') as HTMLElement;

        if (!this.unifiedInput || !this.inputBtn || !this.inputContainer ||
            !this.floatingButton || !this.assistantResponse) {
            throw new Error('Required UI elements not found');
        }
    }

    /**
     * Auto-focus the search field on startup
     */
    private autoFocusSearchField(): void {
        if (this.unifiedInput) {
            // Use a small delay to ensure the DOM is fully ready
            setTimeout(() => {
                this.unifiedInput?.focus();
                this.centerInput();
                this.logger.debug('Search field auto-focused');
            }, 100);
        }
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Input handling
        this.unifiedInput?.addEventListener('keypress', this.handleInputKeypress.bind(this));
        this.unifiedInput?.addEventListener('focus', this.handleInputFocus.bind(this));
        this.unifiedInput?.addEventListener('blur', this.handleInputBlur.bind(this));
        this.inputBtn?.addEventListener('click', this.handleInputSubmit.bind(this));
        this.floatingButton?.addEventListener('click', this.showInput.bind(this));

        // Scroll messages from webview
        window.addEventListener('message', this.handleScrollMessage.bind(this));

        // Click outside to hide assistant
        document.addEventListener('click', this.handleOutsideClick.bind(this));
    }

    /**
     * Setup window controls
     */
    private setupWindowControls(): void {
        const minimizeBtn = document.getElementById('minimizeBtn');
        const maximizeBtn = document.getElementById('maximizeBtn');
        const closeBtn = document.getElementById('closeBtn');

        if (!minimizeBtn || !maximizeBtn || !closeBtn) {
            this.logger.error('Window control buttons not found');
            return;
        }

        minimizeBtn.addEventListener('click', async () => {
            try {
                if (window.yabgo && window.yabgo.minimizeWindow) {
                    await window.yabgo.minimizeWindow();
                    this.logger.info('Window minimized');
                } else {
                    this.logger.error('window.yabgo.minimizeWindow is not available');
                }
            } catch (error) {
                this.logger.error('Failed to minimize window:', error);
            }
        });

        maximizeBtn.addEventListener('click', async () => {
            try {
                if (window.yabgo && window.yabgo.maximizeWindow) {
                    await window.yabgo.maximizeWindow();
                    this.logger.info('Window maximized/restored');
                } else {
                    this.logger.error('window.yabgo.maximizeWindow is not available');
                }
            } catch (error) {
                this.logger.error('Failed to maximize window:', error);
            }
        });

        closeBtn.addEventListener('click', async () => {
            try {
                if (window.yabgo && window.yabgo.closeWindow) {
                    await window.yabgo.closeWindow();
                    this.logger.info('Window closed');
                } else {
                    this.logger.error('window.yabgo.closeWindow is not available');
                }
            } catch (error) {
                this.logger.error('Failed to close window:', error);
            }
        });

        this.logger.info('Window controls initialized');
    }

    /**
     * Handle input focus events
     */
    private handleInputFocus(): void {
        this.centerInput();
        this.showInput();
        this.hideFloatingButton();
    }

    /**
     * Handle input blur events
     */
    private handleInputBlur(): void {
        // Only move to bottom if input is empty and not submitting
        if (this.unifiedInput && !this.unifiedInput.value.trim()) {
            setTimeout(() => {
                this.bottomInput();
                this.showFloatingButton();
            }, 150); // Small delay to allow for focus transitions
        }
    }

    /**
     * Handle input keypress events
     */
    private handleInputKeypress(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.handleInputSubmit();
        } else if (event.key === 'Escape') {
            this.hideAssistantResponse();
            if (this.unifiedInput && !this.unifiedInput.value.trim()) {
                this.unifiedInput.blur();
            }
        }
    }

    /**
     * Handle input submission
     */
    private handleInputSubmit(): void {
        const input = this.unifiedInput?.value?.trim();
        if (!input) return;

        // Check if it's an assistant command
        if (this.isAssistantCommand(input)) {
            this.emit('assistant-query', input);
        } else {
            this.emit('navigate', input);
        }

        if (this.unifiedInput) {
            this.unifiedInput.value = '';
        }
    }

    /**
     * Check if input is an assistant command
     */
    private isAssistantCommand(input: string): boolean {
        const lower = input.toLowerCase();
        const assistantKeywords = ['find', 'search', 'recent', 'clear', 'history', 'visited', 'stats', 'statistics'];
        return assistantKeywords.some(keyword => lower.includes(keyword));
    }

    /**
     * Handle scroll messages from webview
     */
    private handleScrollMessage(event: MessageEvent): void {
        if (event.data.type === 'scroll') {
            this.handleScroll(event.data.direction);
        }
    }

    /**
     * Handle scroll direction changes
     */
    private handleScroll(direction: string): void {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        if (direction === 'down') {
            this.hideInput();
            this.showFloatingButton();
            this.isScrolling = true;
        } else if (direction === 'up') {
            this.scrollTimeout = window.setTimeout(() => {
                if (this.isScrolling) {
                    // Check if input has content - if so, center it, otherwise bottom
                    if (this.unifiedInput && this.unifiedInput.value.trim()) {
                        this.centerInput();
                    } else {
                        this.bottomInput();
                    }
                    this.hideFloatingButton();
                    this.isScrolling = false;
                }
            }, 500);
        }
    }

    /**
     * Hide input container
     */
    private hideInput(): void {
        this.inputContainer?.classList.add('hidden');
    }

    /**
     * Center the input container
     */
    private centerInput(): void {
        if (this.inputContainer) {
            this.inputContainer.classList.remove('bottom', 'hidden');
            this.inputContainer.classList.add('centered');
        }
    }

    /**
     * Position the input container at the bottom
     */
    private bottomInput(): void {
        if (this.inputContainer) {
            this.inputContainer.classList.remove('centered', 'hidden');
            this.inputContainer.classList.add('bottom');
        }
    }

    /**
     * Show input container
     */
    private showInput(): void {
        this.inputContainer?.classList.remove('hidden');
        this.hideFloatingButton();
    }

    /**
     * Show floating button
     */
    private showFloatingButton(): void {
        this.floatingButton?.classList.add('show');
    }

    /**
     * Hide floating button
     */
    private hideFloatingButton(): void {
        this.floatingButton?.classList.remove('show');
    }

    /**
     * Update address bar (placeholder for future implementation)
     */
    public updateAddressBar(url: string): void {
        // Could update a separate address display
        this.logger.debug(`Address bar updated: ${url}`);
    }

    /**
     * Display assistant response
     */
    public displayAssistantResponse(response: any): void {
        if (!this.assistantResponse) return;

        this.assistantResponse.innerHTML = '';
        this.assistantResponse.classList.add('show');

        if (response.type === 'info') {
            this.assistantResponse.innerHTML = `<div class="info-message">${response.message}</div>`;
        } else if (response.type === 'results') {
            const title = document.createElement('h3');
            title.textContent = response.title;
            this.assistantResponse.appendChild(title);

            if (response.items.length === 0) {
                const noResults = document.createElement('div');
                noResults.className = 'no-results';
                noResults.textContent = 'No results found';
                this.assistantResponse.appendChild(noResults);
            } else {
                response.items.forEach((item: any) => {
                    const historyItem = document.createElement('div');
                    historyItem.className = 'history-item';

                    const visitDate = new Date(item.visit_timestamp);
                    const timeStr = visitDate.toLocaleString();

                    historyItem.innerHTML = `
                        <div class="title">${item.title}</div>
                        <div class="url">${item.url}</div>
                        <div class="meta">Visited ${item.visit_count || 1} times · Last: ${timeStr}</div>
                    `;

                    historyItem.addEventListener('click', () => {
                        this.emit('navigate-from-assistant', item.url);
                        this.hideAssistantResponse();
                    });

                    this.assistantResponse?.appendChild(historyItem);
                });
            }
        } else if (response.type === 'error') {
            this.assistantResponse.innerHTML = `<div class="error-message">${response.message}</div>`;
        }
    }

    /**
     * Hide assistant response
     */
    public hideAssistantResponse(): void {
        this.assistantResponse?.classList.remove('show');
    }

    /**
     * Handle clicks outside assistant response
     */
    private handleOutsideClick(event: MouseEvent): void {
        const target = event.target as Element;

        if (!this.assistantResponse?.contains(target) &&
            !this.unifiedInput?.contains(target) &&
            !this.inputBtn?.contains(target)) {
            this.hideAssistantResponse();
        }
    }

    /**
     * Show loading state
     */
    public showLoading(): void {
        // Could add loading indicator
        this.logger.debug('Loading started');
    }

    /**
     * Hide loading state
     */
    public hideLoading(): void {
        // Could remove loading indicator
        this.logger.debug('Loading stopped');
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        this.logger.info('UI manager cleanup completed');
    }
}
