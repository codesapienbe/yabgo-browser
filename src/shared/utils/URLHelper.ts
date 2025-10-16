/**
 * URL processing utilities
 */

export class URLHelper {
    private static readonly PERPLEXITY_SEARCH = 'https://www.perplexity.ai/search?q=';

    /**
     * Process user input and determine if it's a URL or search query
     */
    public static processInput(input: string): string {
        const trimmed = input.trim();

        // Already has protocol
        if (this.hasProtocol(trimmed)) {
            return trimmed;
        }

        // Looks like a domain (contains dot and no spaces)
        if (this.isDomain(trimmed)) {
            return 'https://' + trimmed;
        }

        // Treat as search query
        return this.createSearchURL(trimmed);
    }

    /**
     * Check if input has protocol
     */
    private static hasProtocol(input: string): boolean {
        return input.startsWith('http://') || input.startsWith('https://');
    }

    /**
     * Check if input looks like a domain
     */
    private static isDomain(input: string): boolean {
        // Must contain at least one dot and no spaces
        if (!input.includes('.') || input.includes(' ')) {
            return false;
        }

        // Basic domain pattern validation
        const domainPattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
        return domainPattern.test(input);
    }

    /**
     * Create search URL
     */
    private static createSearchURL(query: string): string {
        return this.PERPLEXITY_SEARCH + encodeURIComponent(query);
    }

    /**
     * Extract domain from URL
     */
    public static extractDomain(url: string): string | null {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return null;
        }
    }

    /**
     * Validate URL
     */
    public static isValidURL(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Clean URL for display (remove protocol and www)
     */
    public static cleanURLForDisplay(url: string): string {
        try {
            const urlObj = new URL(url);
            let hostname = urlObj.hostname;

            // Remove www prefix
            if (hostname.startsWith('www.')) {
                hostname = hostname.substring(4);
            }

            return hostname + urlObj.pathname;
        } catch {
            return url;
        }
    }
}
