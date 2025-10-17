import { EventEmitter } from '../utils/EventEmitter';
import { Logger } from '../../shared/utils/Logger';
import { URLHelper } from '../../shared/utils/URLHelper';
import { marked } from 'marked';

/**
 * Manages UI interactions and state
 */
export class UIManager extends EventEmitter {
    private unifiedInput: HTMLInputElement | null = null;
    private inputBtn: HTMLButtonElement | null = null;
    private inputContainer: HTMLElement | null = null;
    private inputWrapper: HTMLElement | null = null;
    private assistantResponse: HTMLElement | null = null;

    private isScrolling: boolean = false;
    private isLoading: boolean = false;
    private isSearchMode: boolean = false;
    private scrollTimeout: number | null = null;
    private logger: Logger;
    private inputContainerCopy: HTMLElement | null = null; // Added for hiding/showing

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
        this.inputWrapper = document.querySelector('.input-wrapper') as HTMLElement;
        this.assistantResponse = document.getElementById('assistantResponse') as HTMLElement;

        if (!this.unifiedInput || !this.inputBtn || !this.inputContainer ||
            !this.assistantResponse) {
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
     * Focus the input field (public method for external use)
     */
    public focusInput(): void {
        if (this.unifiedInput) {
            this.unifiedInput.focus();
            this.centerInput();
            this.logger.debug('Input field focused');
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
    }

    /**
     * Handle input blur events
     */
    private handleInputBlur(): void {
        // Only move to bottom if input is empty and not submitting
        if (this.unifiedInput && !this.unifiedInput.value.trim()) {
            setTimeout(() => {
                this.bottomInput();
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

        // Ensure input UI is removed for all scenarios
        this.hideInput();

        // Check if it's a domain
        const isDomain = URLHelper['isDomain'](input) || input.includes('://');

        // Check if it's an assistant command
        if (this.isAssistantCommand(input)) {
            this.emit('assistant-query', input);
        } else {
            this.showLoading();
            this.emit('navigate', input);
        }

        // Only clear input if it's NOT a domain
        if (this.unifiedInput && !isDomain) {
            this.unifiedInput.value = '';
        }

        // Blur after a small delay to allow events to process
        if (this.unifiedInput) {
            setTimeout(() => {
                this.unifiedInput?.blur();
            }, 50);
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
        // Don't handle scroll if in search mode (let Perplexity handle its own UI)
        if (this.isSearchMode) {
            return;
        }

        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        if (direction === 'down') {
            this.hideInput();
            this.isScrolling = true;
            if (this.unifiedInput) {
                this.unifiedInput.readOnly = true;
            }
        } else if (direction === 'up') {
            this.scrollTimeout = window.setTimeout(() => {
                if (this.isScrolling && !this.isSearchMode) {
                    // Check if input has content - if so, center it, otherwise bottom
                    if (this.unifiedInput && this.unifiedInput.value.trim()) {
                        this.centerInput();
                    } else {
                        this.bottomInput();
                    }
                    this.isScrolling = false;
                    // Only enable input if not loading
                    if (this.unifiedInput && !this.isLoading) {
                        this.unifiedInput.readOnly = false;
                    }
                }
            }, 500);
        }
    }

    /**
     * Hide input container (remove from DOM)
     */
    private hideInput(): void {
        if (this.inputContainer) {
            // Store the container in case we need to restore it
            if (!this.inputContainerCopy) {
                this.inputContainerCopy = this.inputContainer.cloneNode(true) as HTMLElement;
            }
            // Remove from DOM completely
            this.inputContainer.remove();
        }
    }

    /**
     * Show input container (restore to DOM)
     */
    private showInput(): void {
        if (this.inputContainer && this.inputContainer.parentElement) {
            // Already in DOM
            this.inputContainer.style.display = '';
            this.inputContainer.style.visibility = '';
            return;
        }

        // Need to restore from copy
        if (this.inputContainerCopy) {
            const parent = document.querySelector('.glass-overlay');
            if (parent) {
                this.inputContainer = this.inputContainerCopy.cloneNode(true) as HTMLElement;
                parent.appendChild(this.inputContainer);

                // Re-bind event listeners after DOM restoration
                this.setupInputListeners();
            }
        }
    }

    /**
     * Setup input event listeners
     */
    private setupInputListeners(): void {
        // Re-find elements after DOM restoration
        this.unifiedInput = this.inputContainer?.querySelector('input') as HTMLInputElement || null;
        this.inputBtn = this.inputContainer?.querySelector('button') as HTMLButtonElement || null;

        // Re-bind listeners
        this.unifiedInput?.addEventListener('keypress', this.handleInputKeypress.bind(this));
        this.unifiedInput?.addEventListener('focus', this.handleInputFocus.bind(this));
        this.unifiedInput?.addEventListener('blur', this.handleInputBlur.bind(this));
        this.inputBtn?.addEventListener('click', this.handleInputSubmit.bind(this));
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
        } else if (response.type === 'navigate') {
            // Handle Perplexity navigation responses
            this.assistantResponse.innerHTML = `
                <div class="perplexity-info">
                    <div class="info-message">${response.message}</div>
                    <div class="loading-text">Opening Perplexity...</div>
                </div>
            `;
            // Auto-hide after a brief moment to let user see the message
            setTimeout(() => {
                this.hideAssistantResponse();
            }, 800);
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
        this.isLoading = true;
        this.inputWrapper?.classList.add('loading');
        if (this.unifiedInput) {
            this.unifiedInput.readOnly = true;
        }
        this.logger.debug('Loading started');
    }

    /**
     * Hide loading state
     */
    public hideLoading(): void {
        this.isLoading = false;
        this.inputWrapper?.classList.remove('loading');
        if (this.unifiedInput && !this.isScrolling) {
            this.unifiedInput.readOnly = false;
        }
        this.logger.debug('Loading stopped');
    }

    /**
     * Enter search mode (hides URL field for Perplexity searches)
     */
    public setSearchMode(enabled: boolean): void {
        this.isSearchMode = enabled;

        if (enabled) {
            // Hide URL input in search mode
            this.hideInput();
            // Clear input and set it to read-only to prevent accidental typing
            if (this.unifiedInput) {
                this.unifiedInput.value = '';
                this.unifiedInput.readOnly = true;
            }
            this.logger.debug('Entered search mode - URL field hidden and cleared');
        } else {
            // Show URL input when exiting search mode
            this.showInput();
            this.bottomInput();
            if (this.unifiedInput) {
                this.unifiedInput.readOnly = false;
            }
            this.logger.debug('Exited search mode - URL field visible');
        }
    }

    /**
     * Check if in search mode
     */
    public isInSearchMode(): boolean {
        return this.isSearchMode;
    }

    /**
     * Show reader overlay with markdown content
     */
    public async showReader(markdown: string): Promise<void> {
        let overlay = document.getElementById('readerOverlay') as HTMLElement | null;
        if (!overlay) return;

        // Parse markdown to HTML
        const htmlContent = await marked.parse(markdown);

        overlay.innerHTML = `<div class="reader-close" id="readerClose">×</div><div class="reader-content">${htmlContent}</div>`;
        overlay.classList.add('show');

        const closeBtn = document.getElementById('readerClose');
        closeBtn?.addEventListener('click', () => {
            this.hideReader();
        });
    }

    /**
     * Hide reader overlay
     */
    public hideReader(): void {
        const overlay = document.getElementById('readerOverlay');
        if (!overlay) return;
        overlay.classList.remove('show');
        overlay.innerHTML = '';
    }

    /**
     * Restore input container (public wrapper for showInput)
     */
    public restoreInput(): void {
        this.showInput();
    }

    /**
     * Remove input container from DOM (public wrapper for hideInput)
     */
    public removeInput(): void {
        this.hideInput();
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
