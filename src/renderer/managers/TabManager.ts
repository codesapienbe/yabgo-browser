import { EventEmitter } from '../utils/EventEmitter';
import { Tab, TabCreationOptions } from '../../shared/types/DataTypes';
import { Logger } from '../../shared/utils/Logger';
import { URLHelper } from '../../shared/utils/URLHelper';

/**
 * Tab state cache interface for storing tab DOM and state
 */
interface TabCache {
    webviewElement?: Electron.WebviewTag;
    scrollPosition?: { x: number; y: number };
    lastLoadedUrl?: string;
    createdAt?: number;
    isReader?: boolean;
}

/**
 * Manages browser tabs and tab-related functionality
 */
export class TabManager extends EventEmitter {
    private tabs: Map<string, Tab> = new Map();
    private tabCache: Map<string, TabCache> = new Map();
    private activeTabId: string | null = null;
    private tabContainer: HTMLElement | null = null;
    private webviewContainer: HTMLElement | null = null;
    private messageListenerSetup: boolean = false;
    private logger: Logger;

    constructor() {
        super();
        this.logger = new Logger('TabManager');
    }

    /**
     * Initialize tab manager
     */
    public async initialize(): Promise<void> {
        this.findElements();
        this.createDefaultTab();
        this.setupEventListeners();
        this.setupMessageListener();
        this.renderTabs();
        this.renderWebviews();

        this.logger.info('Tab manager initialized');
    }

    /**
     * Find DOM elements
     */
    private findElements(): void {
        this.tabContainer = document.getElementById('tabContainer') as HTMLElement;
        this.webviewContainer = document.getElementById('webviewContainer') as HTMLElement;

        if (!this.tabContainer || !this.webviewContainer) {
            throw new Error('Tab container elements not found');
        }
    }

    /**
     * Create the default tab
     */
    private createDefaultTab(): void {
        const tabId = this.generateTabId();
        const tab: Tab = {
            id: tabId,
            title: 'New Tab',
            url: 'about:blank',
            isActive: true,
            canGoBack: false,
            canGoForward: false,
            isLoading: false
        };

        this.tabs.set(tabId, tab);
        this.activeTabId = tabId;
    }

    /**
     * Setup event listeners
     */
    private setupEventListeners(): void {
        // Listen for tab close button clicks and tab switches using event delegation
        if (this.tabContainer) {
            this.tabContainer.addEventListener('click', (event) => {
                const target = event.target as HTMLElement;

                // Handle tab close button
                if (target.classList.contains('tab-close')) {
                    event.stopPropagation();
                    const tabId = target.getAttribute('data-tab-id');
                    if (tabId) {
                        this.closeTab(tabId);
                    }
                    return;
                }

                // Handle new tab button
                if (target.classList.contains('new-tab-btn') || target.closest('.new-tab-btn')) {
                    event.stopPropagation();
                    this.createNewTab();
                    return;
                }

                // Handle tab switching - find closest tab-item parent
                const tabItem = target.closest('.tab-item');
                if (tabItem) {
                    event.stopPropagation();
                    const tabId = tabItem.getAttribute('data-tab-id');
                    if (tabId && tabId !== this.activeTabId) {
                        this.switchToTab(tabId);
                    }
                }
            });
        }
    }

    /**
     * Setup global message listener for tab events
     */
    private setupMessageListener(): void {
        if (this.messageListenerSetup) return;

        window.addEventListener('message', (event) => {
            if (event.data.type === 'navigation-state') {
                const tabId = event.data.tabId;
                if (this.tabs.has(tabId)) {
                    this.updateTab(tabId, {
                        canGoBack: event.data.canGoBack,
                        canGoForward: event.data.canGoForward
                    });
                }
            } else if (event.data.type === 'scroll') {
                // Relay scroll messages to UIManager
                window.dispatchEvent(new MessageEvent('message', {
                    data: event.data
                }));
            } else if (event.data.type === 'reader-content') {
                // Emit reader content to app
                const tabId = event.data.tabId;
                const markdown = event.data.markdown;
                this.emit('reader-content', tabId, markdown);
            }
        });

        this.messageListenerSetup = true;
    }

    /**
     * Toggle reader mode for the active tab
     */
    public async toggleReader(tabId?: string): Promise<void> {
        const activeTab = tabId ? this.tabs.get(tabId) : this.getActiveTab();
        if (!activeTab) return;

        const id = activeTab.id;
        const cache = this.tabCache.get(id) || {};
        const isReader = !!cache.isReader;

        if (isReader) {
            // Exit reader mode
            cache.isReader = false;
            this.tabCache.set(id, cache);
            this.emit('reader-mode', id, false);
            // Clear reader preference for site
            try {
                const url = activeTab.url || '';
                const site = new URL(url).hostname;
                const prefs = JSON.parse(localStorage.getItem('readerPrefs') || '{}');
                delete prefs[site];
                localStorage.setItem('readerPrefs', JSON.stringify(prefs));
            } catch (e) { }
            return;
        }

        // Enter reader mode: extract content and post markdown back
        const webview = document.getElementById(`webview-${id}`) as Electron.WebviewTag | null;
        if (!webview) return;

        // Skip reader for blank/internal pages or data URIs
        const urlForCheck = (activeTab.url || (webview.getAttribute && webview.getAttribute('src')) || webview.src || '').toString();
        if (!urlForCheck || urlForCheck === 'about:blank' || urlForCheck.startsWith('data:')) {
            this.logger.debug(`Skipping reader mode: page appears blank or internal (url=${urlForCheck})`);
            return;
        }

        try {
            await this.safeExecuteScript(webview, `(function() {
                function escapeHtml(s){return s}

                function nodeToMarkdown(node){
                    if(!node) return '';
                    const nodeName = node.nodeName.toLowerCase();
                    if(nodeName === '#text'){
                        return node.textContent.replace(/\s+/g,' ').trim();
                    }
                    if(['script','style','noscript'].includes(nodeName)) return '';
                    if(nodeName.match(/^h[1-6]$/)){
                        const level = parseInt(nodeName.charAt(1));
                        return '\n' + '#'.repeat(level) + ' ' + (node.textContent || '') + '\n\n';
                    }
                    if(nodeName === 'p'){
                        return (Array.from(node.childNodes).map(nodeToMarkdown).join('') || '') + '\n\n';
                    }
                    if(nodeName === 'li'){
                        return '- ' + (Array.from(node.childNodes).map(nodeToMarkdown).join('')) + '\n';
                    }
                    if(nodeName === 'ul' || nodeName === 'ol'){
                        return Array.from(node.children).map(nodeToMarkdown).join('') + '\n';
                    }
                    if(nodeName === 'a'){
                        const href = node.getAttribute('href') || '';
                        const text = node.textContent || href;
                        return '[' + text + '](' + href + ')';
                    }
                    if(nodeName === 'img'){
                        const src = node.getAttribute('src') || '';
                        const alt = node.getAttribute('alt') || '';
                        return '![' + alt + '](' + src + ')';
                    }
                    // Default: recurse
                    return Array.from(node.childNodes).map(nodeToMarkdown).join('');
                }

                var root = document.querySelector('article') || document.querySelector('main') || document.querySelector('div[itemprop="articleBody"]') || document.body;
                var md = nodeToMarkdown(root);
                window.postMessage({ type: 'reader-content', tabId: '${id}', markdown: md }, '*');
            })();`);

            // mark reader mode pending
            cache.isReader = true;
            this.tabCache.set(id, cache);
            this.emit('reader-mode', id, true);
            // Persist reader preference for site
            try {
                const url = activeTab.url || '';
                const site = new URL(url).hostname;
                const prefs = JSON.parse(localStorage.getItem('readerPrefs') || '{}');
                prefs[site] = true;
                localStorage.setItem('readerPrefs', JSON.stringify(prefs));
            } catch (e) { }
        } catch (e) {
            this.logger.error('Failed to extract reader content:', e);
        }
    }

    /**
     * Create a new tab
     */
    public createNewTab(options: TabCreationOptions = {}): string {
        const tabId = this.generateTabId();
        const tab: Tab = {
            id: tabId,
            title: options.title || 'New Tab',
            url: options.url || 'about:blank',
            isActive: options.activate !== false,
            canGoBack: false,
            canGoForward: false,
            isLoading: false
        };

        this.tabs.set(tabId, tab);

        if (options.activate !== false) {
            this.switchToTab(tabId);
        }

        this.renderTabs();
        this.emit('tab-created', tab);

        this.logger.info(`Created new tab: ${tabId}`);
        return tabId;
    }

    /**
     * Close a tab
     */
    public closeTab(tabId: string): void {
        if (!this.tabs.has(tabId)) return;

        const wasActive = this.tabs.get(tabId)?.isActive;
        this.tabs.delete(tabId);

        // Clear cache for this tab
        const cachedTab = this.tabCache.get(tabId);
        if (cachedTab?.webviewElement) {
            cachedTab.webviewElement.remove();
        }
        this.tabCache.delete(tabId);

        // If closing active tab, switch to another tab
        if (wasActive && this.tabs.size > 0) {
            const remainingTabs = Array.from(this.tabs.keys());
            this.switchToTab(remainingTabs[0]);
        } else if (this.tabs.size === 0) {
            // Create a new default tab if all tabs are closed
            this.createDefaultTab();
        }

        this.renderTabs();
        this.emit('tab-closed', tabId);

        this.logger.info(`Closed tab: ${tabId}`);
    }

    /**
     * Switch to a specific tab
     */
    public switchToTab(tabId: string): void {
        if (!this.tabs.has(tabId)) return;

        // Update active state for all tabs
        this.tabs.forEach((tab, id) => {
            tab.isActive = id === tabId;
        });

        this.activeTabId = tabId;
        this.renderTabs();
        this.renderWebviews();

        const tab = this.tabs.get(tabId);
        if (tab) {
            this.emit('tab-switched', tab);
        }

        this.logger.debug(`Switched to tab: ${tabId}`);
    }

    /**
     * Get the active tab
     */
    public getActiveTab(): Tab | null {
        return this.activeTabId ? this.tabs.get(this.activeTabId) || null : null;
    }

    /**
     * Get all tabs
     */
    public getAllTabs(): Tab[] {
        return Array.from(this.tabs.values());
    }

    /**
     * Update tab information
     */
    public updateTab(tabId: string, updates: Partial<Tab>): void {
        const tab = this.tabs.get(tabId);
        if (tab) {
            Object.assign(tab, updates);
            this.renderTabs();
            this.emit('tab-updated', tab);
        }
    }

    /**
     * Render the tab bar
     */
    private renderTabs(): void {
        if (!this.tabContainer) return;

        const tabs = Array.from(this.tabs.values());
        this.tabContainer.innerHTML = '';

        tabs.forEach(tab => {
            const tabElement = document.createElement('div');
            tabElement.className = `tab-item ${tab.isActive ? 'active' : ''}`;
            tabElement.setAttribute('data-tab-id', tab.id);

            tabElement.innerHTML = `
                <div class="tab-favicon" style="${tab.favicon ? `background-image: url(${tab.favicon})` : ''}"></div>
                <div class="tab-title">${this.truncateTitle(tab.title)}</div>
                <div class="tab-loading ${tab.isLoading ? 'show' : ''}"></div>
                <button class="tab-close" data-tab-id="${tab.id}">×</button>
            `;

            if (this.tabContainer) {
                this.tabContainer.appendChild(tabElement);
            }
        });

        // Add new tab button
        if (this.tabContainer) {
            const newTabElement = document.createElement('button');
            newTabElement.className = 'new-tab-btn';
            newTabElement.id = 'newTabBtn';
            newTabElement.innerHTML = '+';
            newTabElement.title = 'New Tab';

            this.tabContainer.appendChild(newTabElement);
        }
    }

    /**
     * Render webviews for all tabs
     */
    private renderWebviews(): void {
        if (!this.webviewContainer) return;

        this.tabs.forEach((tab, tabId) => {
            // Check if webview is already cached
            const cached = this.tabCache.get(tabId);
            let webviewElement = cached?.webviewElement;

            // If not cached, create new webview
            if (!webviewElement) {
                webviewElement = document.createElement('webview');
                webviewElement.className = `tab-webview ${tab.isActive ? 'active' : ''}`;
                webviewElement.id = `webview-${tabId}`;
                webviewElement.src = tab.url;
                webviewElement.allowpopups = true;
                webviewElement.partition = `persist:yabgo:${tabId}`;

                // Setup webview event listeners
                this.setupWebviewEvents(webviewElement, tabId);

                // Cache the webview element
                if (!this.tabCache.has(tabId)) {
                    this.tabCache.set(tabId, {});
                }
                const tabCacheData = this.tabCache.get(tabId)!;
                tabCacheData.webviewElement = webviewElement;
                tabCacheData.lastLoadedUrl = tab.url;
                tabCacheData.createdAt = Date.now();

                // Append to container
                if (this.webviewContainer) {
                    this.webviewContainer.appendChild(webviewElement);
                }

                this.logger.debug(`Created webview for tab: ${tabId}`);
            } else {
                // Webview already exists, just update active state
                webviewElement.className = `tab-webview ${tab.isActive ? 'active' : ''}`;

                // Ensure it's in the DOM
                if (!webviewElement.parentElement) {
                    if (this.webviewContainer) {
                        this.webviewContainer.appendChild(webviewElement);
                    }
                }

                this.logger.debug(`Reusing cached webview for tab: ${tabId}`);
            }
        });
    }

    /**
     * Setup event listeners for a webview
     */
    private setupWebviewEvents(webview: Electron.WebviewTag, tabId: string): void {
        webview.addEventListener('did-start-loading', () => {
            this.updateTab(tabId, { isLoading: true });
        });

        webview.addEventListener('did-stop-loading', () => {
            this.updateTab(tabId, { isLoading: false });
        });

        webview.addEventListener('page-title-updated', (event) => {
            const title = (event as any).title;
            this.updateTab(tabId, { title });
        });

        webview.addEventListener('page-favicon-updated', (event) => {
            const favicons = (event as any).favicons;
            if (favicons && favicons.length > 0) {
                this.updateTab(tabId, { favicon: favicons[0] });
            }
        });

        webview.addEventListener('new-window', (event) => {
            this.createNewTab({ url: (event as any).url });
        });

        // Update navigation state and setup scroll detection
        webview.addEventListener('dom-ready', () => {
            this.updateNavigationState(webview, tabId);
            // Setup scroll detection for this webview
            if (webview.src && !webview.src.startsWith('about:')) {
                this.setupScrollDetection(webview);
            }
            // Auto-accept cookies and remove sign-in for Perplexity
            if (webview.src && webview.src.includes('perplexity.ai')) {
                this.autoAcceptPerplexityCookies(webview);
                this.removePerplexitySignInPrompt(webview);
            }
        });
    }

    /**
     * Safely execute a script inside a webview, retrying after dom-ready if needed.
     */
    private async safeExecuteScript(webview: Electron.WebviewTag, script: string, timeoutMs: number = 5000): Promise<any> {
        try {
            return await webview.executeJavaScript(script);
        } catch (err) {
            // If immediate execution failed (possibly because guest not ready), wait for dom-ready and retry
            return await new Promise((resolve, reject) => {
                let settled = false;

                const onDomReady = () => {
                    try {
                        webview.removeEventListener('dom-ready', onDomReady);
                        webview.executeJavaScript(script).then(res => {
                            settled = true;
                            resolve(res);
                        }).catch(e => {
                            settled = true;
                            reject(e);
                        });
                    } catch (e) {
                        settled = true;
                        reject(e);
                    }
                };

                webview.addEventListener('dom-ready', onDomReady);

                const timer = setTimeout(() => {
                    if (!settled) {
                        webview.removeEventListener('dom-ready', onDomReady);
                        reject(new Error('safeExecuteScript timeout'));
                    }
                    clearTimeout(timer);
                }, timeoutMs);
            });
        }
    }

    /**
     * Setup scroll detection for a webview
     */
    private setupScrollDetection(webview: Electron.WebviewTag): void {
        this.safeExecuteScript(webview, `
            let lastScrollY = 0;
            let ticking = false;

            function handleScroll() {
                const currentScrollY = window.scrollY;

                if (currentScrollY > 100 && currentScrollY > lastScrollY) {
                    window.postMessage({ type: 'scroll', direction: 'down' }, '*');
                } else if (currentScrollY < lastScrollY) {
                    window.postMessage({ type: 'scroll', direction: 'up' }, '*');
                }

                lastScrollY = currentScrollY;
                ticking = false;
            }

            function requestScrollUpdate() {
                if (!ticking) {
                    requestAnimationFrame(handleScroll);
                    ticking = true;
                }
            }

            window.addEventListener('scroll', requestScrollUpdate, { passive: true });
        `).catch(_err => {
            this.logger.debug('Scroll detection setup completed or not needed');
        });
    }

    /**
     * Auto-accept cookies on Perplexity
     */
    private autoAcceptPerplexityCookies(webview: Electron.WebviewTag): void {
        this.safeExecuteScript(webview, `
            (function autoAcceptCookies() {
                // Common cookie accept button selectors used by various sites
                const selectors = [
                    'button[id*="cookie"][id*="accept"]',
                    'button[data-test*="cookie-accept"]',
                    'button:has-text("Accept")',
                    '.cookie-accept',
                    'button[aria-label*="accept"]',
                    'button[aria-label*="cookie"]',
                    'button:contains("Accept All")',
                    'button:contains("Accept")',
                    'a[id*="cookie-accept"]',
                    '[role="button"][aria-label*="accept"]'
                ];

                // Try to find and click the accept button
                for (const selector of selectors) {
                    try {
                        const button = document.querySelector(selector);
                        if (button && button.textContent?.toLowerCase().includes('accept')) {
                            button.click();
                            console.log('Cookie accepted on Perplexity');
                            return;
                        }
                    } catch (e) {
                        // Selector might not be valid, continue to next
                    }
                }

                // Fallback: Look for any button with accept text
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                    if (btn.textContent?.toLowerCase().includes('accept') && 
                        btn.textContent?.toLowerCase().includes('cookie')) {
                        btn.click();
                        console.log('Cookie accepted on Perplexity (fallback)');
                        return;
                    }
                }
            })();
        `).catch(_err => {
            this.logger.debug('Cookie auto-accept setup completed for Perplexity');
        });
    }

    /**
     * Remove sign-in prompt from Perplexity
     */
    private removePerplexitySignInPrompt(webview: Electron.WebviewTag): void {
        this.safeExecuteScript(webview, `
            (function removeSignInPrompt() {
                const targetKeywords = ['sign in', 'create an account', 'sign up', 'create account', 'log in', 'Sign in or create an account', 'Single sign-on (SSO)'];
                let monitoringActive = false;

                const removeSignInElements = () => {
                    const allElements = document.querySelectorAll('*');
                    let removed = 0;

                    allElements.forEach(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        const isSignIn = targetKeywords.some(keyword => text.includes(keyword));
                        
                        if (isSignIn && (el.offsetParent !== null || el.offsetHeight > 0)) {
                            // Check if it's a clickable element (button, link, etc.)
                            if (el.tagName === 'BUTTON' || 
                                el.tagName === 'A' || 
                                el.role === 'button' ||
                                el.classList.toString().includes('button') ||
                                el.classList.toString().includes('btn')) {
                                try {
                                    // Remove the element completely from DOM
                                    el.remove();
                                    removed++;
                                    console.log('Removed sign-in element:', el.textContent?.substring(0, 50));
                                } catch (e) {
                                    console.log('Could not remove element');
                                }
                            }
                        }
                    });

                    return removed;
                };

                // Start monitoring after 3 seconds
                setTimeout(() => {
                    monitoringActive = true;
                    console.log('Starting sign-in prompt monitoring...');
                    
                    // Initial removal
                    removeSignInElements();
                    
                    // Continue monitoring for 30 seconds, checking every 500ms
                    let monitorCount = 0;
                    const monitorInterval = setInterval(() => {
                        const removed = removeSignInElements();
                        monitorCount++;
                        
                        if (removed > 0) {
                            console.log('Found and removed', removed, 'more sign-in elements');
                        }
                        
                        // Stop after 30 seconds (60 * 500ms = 30s)
                        if (monitorCount >= 60) {
                            clearInterval(monitorInterval);
                            console.log('Sign-in monitoring completed');
                            monitoringActive = false;
                        }
                    }, 500);
                }, 3000);
            })();
        `).catch(_err => {
            this.logger.debug('Sign-in prompt removal setup completed for Perplexity');
        });
    }

    /**
     * Update navigation state for a tab
     */
    private updateNavigationState(webview: Electron.WebviewTag, tabId: string): void {
        this.safeExecuteScript(webview, `
            Promise.all([
                new Promise(resolve => {
                    if (window.history && window.history.length) {
                        resolve({
                            canGoBack: window.history.length > 1,
                            currentIndex: window.history.length - 1
                        });
                    } else {
                        resolve({ canGoBack: false, currentIndex: 0 });
                    }
                })
            ]).then(([navState]) => {
                window.postMessage({
                    type: 'navigation-state',
                    tabId: '${tabId}',
                    canGoBack: navState.canGoBack,
                    canGoForward: navState.currentIndex > 0
                }, '*');
            });
        `).catch(err => {
            this.logger.error('Error updating navigation state:', err);
        });
    }

    /**
     * Navigate in the active tab
     */
    public navigate(url: string): void {
        const activeTab = this.getActiveTab();
        if (activeTab) {
            const webview = document.getElementById(`webview-${activeTab.id}`) as Electron.WebviewTag;
            if (webview) {
                const processedUrl = URLHelper.processInput(url);
                webview.src = processedUrl;
                this.updateTab(activeTab.id, { url: processedUrl });
            }
        }
    }

    /**
     * Go back in the active tab
     */
    public goBack(): boolean {
        const activeTab = this.getActiveTab();
        if (activeTab && activeTab.canGoBack) {
            const webview = document.getElementById(`webview-${activeTab.id}`) as Electron.WebviewTag;
            if (webview) {
                webview.goBack();
                return true;
            }
        }
        return false;
    }

    /**
     * Go forward in the active tab
     */
    public goForward(): boolean {
        const activeTab = this.getActiveTab();
        if (activeTab && activeTab.canGoForward) {
            const webview = document.getElementById(`webview-${activeTab.id}`) as Electron.WebviewTag;
            if (webview) {
                webview.goForward();
                return true;
            }
        }
        return false;
    }

    /**
     * Refresh the active tab
     */
    public refresh(): void {
        const activeTab = this.getActiveTab();
        if (activeTab) {
            const webview = document.getElementById(`webview-${activeTab.id}`) as Electron.WebviewTag;
            if (webview) {
                webview.reload();
            }
        }
    }

    /**
     * Scroll to top in the active tab
     */
    public scrollToTop(): void {
        const activeTab = this.getActiveTab();
        if (activeTab) {
            const webview = document.getElementById(`webview-${activeTab.id}`) as Electron.WebviewTag;
            if (webview) {
                this.safeExecuteScript(webview, 'window.scrollTo(0, 0)').catch(() => { });
            }
        }
    }

    /**
     * Generate a unique tab ID
     */
    private generateTabId(): string {
        return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Truncate tab title if too long
     */
    private truncateTitle(title: string, maxLength: number = 20): string {
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength - 3) + '...';
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        // Clear all cached webviews
        this.tabCache.forEach((cache) => {
            if (cache.webviewElement) {
                cache.webviewElement.remove();
            }
        });
        this.tabCache.clear();

        this.tabs.clear();
        this.activeTabId = null;
        this.tabContainer = null;
        this.webviewContainer = null;
        this.logger.info('Tab manager cleanup completed');
    }

    /**
     * Get cache statistics for debugging
     */
    public getCacheStats(): { tabCount: number; cachedCount: number; cacheSize: number } {
        return {
            tabCount: this.tabs.size,
            cachedCount: this.tabCache.size,
            cacheSize: Array.from(this.tabCache.values()).reduce((size, cache) => {
                return size + (cache.webviewElement ? 1 : 0);
            }, 0)
        };
    }
}
