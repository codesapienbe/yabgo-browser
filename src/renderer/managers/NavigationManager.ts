import { EventEmitter } from '../utils/EventEmitter';
import { URLHelper } from '../../shared/utils/URLHelper';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages browser navigation and webview interactions
 */
export class NavigationManager extends EventEmitter {
    private webview: Electron.WebviewTag | null = null;
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
        this.webview = document.getElementById('webview') as Electron.WebviewTag;

        if (!this.webview) {
            throw new Error('Webview element not found');
        }

        this.setupWebviewEvents();
        this.logger.info('Navigation manager initialized');
    }

    /**
     * Setup webview event listeners
     */
    private setupWebviewEvents(): void {
        if (!this.webview) return;

        this.webview.addEventListener('did-start-loading', () => {
            this.logger.debug('Started loading page');
            this.emit('loading-start');
        });

        this.webview.addEventListener('did-stop-loading', () => {
            this.logger.debug('Stopped loading page');
            this.emit('loading-stop');
            this.savePageMetadata();
        });

        this.webview.addEventListener('page-title-updated', (event) => {
            this.logger.debug(`Page title updated: ${(event as any).title}`);
            this.emit('title-updated', (event as any).title);
        });

        this.webview.addEventListener('new-window', (event) => {
            this.navigate((event as any).url);
        });

        this.webview.addEventListener('dom-ready', () => {
            this.setupScrollDetection();
        });
    }

    /**
     * Navigate to URL or process search query
     */
    public navigate(input: string): void {
        if (!this.webview) return;

        const url = URLHelper.processInput(input);
        this.webview.src = url;

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

            if (this.webview) {
                this.webview.src = url;
            }

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

            if (this.webview) {
                this.webview.src = url;
            }

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
        if (this.webview) {
            this.webview.reload();
            this.logger.debug('Page refreshed');
        }
    }

    /**
     * Scroll to top of page
     */
    public scrollToTop(): void {
        if (this.webview) {
            this.webview.executeJavaScript('window.scrollTo(0, 0)');
            this.logger.debug('Scrolled to top');
        }
    }

    /**
     * Load default homepage
     */
    public loadDefaultPage(): void {
        if (!this.webview) return;
        this.navigate('https://perplexity.ai');
        this.logger.info('Default page loaded: perplexity.ai');
    }

    /**
     * Setup scroll detection for floating UI
     */
    private setupScrollDetection(): void {
        if (!this.webview) return;

        this.webview.executeJavaScript(`
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
        `);
    }

    /**
     * Save page metadata to database
     */
    private async savePageMetadata(): Promise<void> {
        if (!this.webview) return;

        try {
            const url = this.webview.src;
            if (!url || url.startsWith('about:')) return;

            const metadata = await this.extractPageMetadata(url);
            await window.yabgo.savePageMetadata(metadata);

            this.logger.debug(`Metadata saved for: ${url}`);
        } catch (error) {
            this.logger.error('Error saving page metadata:', error);
        }
    }

    /**
     * Extract page metadata from current page
     */
    private async extractPageMetadata(url: string): Promise<any> {
        if (!this.webview) throw new Error('Webview not available');

        return new Promise((resolve) => {
            this.webview!.executeJavaScript(`
                (function() {
                    const getMetaContent = (name) => {
                        const meta = document.querySelector('meta[name="' + name + '"]') ||
                                    document.querySelector('meta[property="og:' + name + '"]');
                        return meta ? meta.content : null;
                    };

                    const getText = () => {
                        const body = document.body;
                        if (!body) return '';
                        const clone = body.cloneNode(true);
                        const scripts = clone.querySelectorAll('script, style, noscript');
                        scripts.forEach(el => el.remove());
                        return clone.innerText.substring(0, 1000);
                    };

                    const getFavicon = () => {
                        const favicon = document.querySelector('link[rel*="icon"]') ||
                                      document.querySelector('link[rel="shortcut icon"]');
                        return favicon ? favicon.href : null;
                    };

                    return {
                        url: window.location.href,
                        title: document.title || 'Untitled',
                        description: getMetaContent('description') || '',
                        keywords: getMetaContent('keywords') || '',
                        content_snippet: getText(),
                        visit_timestamp: new Date().toISOString(),
                        favicon_url: getFavicon()
                    };
                })()
            `).then(metadata => {
                resolve(metadata);
            }).catch(err => {
                this.logger.error('Metadata extraction error:', err);
                resolve({
                    url,
                    title: 'Error',
                    description: '',
                    keywords: '',
                    content_snippet: '',
                    visit_timestamp: new Date().toISOString(),
                    favicon_url: null
                });
            });
        });
    }

    /**
     * Get current URL
     */
    public getCurrentURL(): string | null {
        return this.webview?.src || null;
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        // Remove event listeners if needed
        this.logger.info('Navigation manager cleanup completed');
    }
}
