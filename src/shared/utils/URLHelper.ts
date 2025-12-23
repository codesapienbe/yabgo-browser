/**
 * URL processing utilities
 */

export class URLHelper {
    private static readonly PERPLEXITY_SEARCH = 'https://www.perplexity.ai/search?q=';

    // Optional override for default repo (format: owner/repo). Useful for user-configured settings or testing.
    private static configuredRepo: string | null = null;

    /**
     * Programmatically configure the default GitHub repo used by shortcuts (owner/repo). Pass null to clear.
     */
    public static configureDefaultRepo(repo: string | null): void {
        this.configuredRepo = repo;
    }

    /**
     * Process user input and determine if it's a URL or search query
     */
    public static processInput(input: string): string {
        const trimmed = input.trim();

        // Shortcut handling (e.g. gh:312 -> PR 312 on default repo)
        const shortcut = this.processShortcut(trimmed);
        if (shortcut) return shortcut;

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
     * Try to interpret common shortcuts, e.g.:
     *  - gh:312 -> PR #312 on default repo
     *  - gh:owner/repo#312 -> PR on explicit repo
     *  - gh:issue:45 or gh:i:45 -> issue
     *  - ghc:<sha> or gh:commit:<sha> -> commit
     */
    private static processShortcut(input: string): string | null {
        // PR shorthand: gh:312
        const prSimple = /^gh:(\d+)$/i.exec(input);
        if (prSimple) {
            const pr = prSimple[1];
            const repo = this.getDefaultRepo();
            if (repo) return `https://github.com/${repo.owner}/${repo.repo}/pull/${pr}`;
            return null;
        }

        // Explicit repo PR: gh:owner/repo#312 or gh:owner/repo:312
        const prExplicit = /^gh:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)[#:]?(\d+)$/i.exec(input);
        if (prExplicit) {
            const owner = prExplicit[1];
            const repo = prExplicit[2];
            const pr = prExplicit[3];
            return `https://github.com/${owner}/${repo}/pull/${pr}`;
        }

        // Issue shorthand: gh:issue:45 or gh:i:45
        const issue = /^gh:(?:issue|i):?(\d+)$/i.exec(input);
        if (issue) {
            const id = issue[1];
            const repo = this.getDefaultRepo();
            if (repo) return `https://github.com/${repo.owner}/${repo.repo}/issues/${id}`;
            return null;
        }

        // Commit shorthand: ghc:sha or gh:commit:sha
        const commit = /^(?:ghc:|gh:commit:)([0-9a-fA-F]{7,40})$/i.exec(input);
        if (commit) {
            const sha = commit[1];
            const repo = this.getDefaultRepo();
            if (repo) return `https://github.com/${repo.owner}/${repo.repo}/commit/${sha}`;
            return null;
        }

        return null;
    }

    /**
     * Determine default repository (owner + repo) using package.json repository field, if present.
     */
    private static getDefaultRepo(): { owner: string; repo: string } | null {
        // 1) If manually configured via API (or tests), use that
        if (this.configuredRepo) {
            const m = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/.exec(this.configuredRepo);
            if (m) return { owner: m[1], repo: m[2] };
            return null;
        }

        // 2) If running in a browser, allow user-provided setting via localStorage key 'github.defaultRepo'
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const val = window.localStorage.getItem('github.defaultRepo');
                if (val) {
                    const m = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/.exec(val.trim());
                    if (m) return { owner: m[1], repo: m[2] };
                }
            }
        } catch {
            // ignore localStorage errors
        }

        // 3) Fallback: infer repository from package.json (homepage or repository.url)
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pkg: any = require('../../../package.json');
            const repoField = (pkg && (pkg.repository && (pkg.repository.url || pkg.repository)) ) || pkg.homepage || null;
            if (!repoField) return null;

            const url = typeof repoField === 'string' ? repoField : (repoField.url || '');
            const m = new RegExp('github.com[:/]([^/]+)/([^/]+)(?:\\.git)?', 'i').exec(url);
            if (!m) return null;
            return { owner: m[1], repo: m[2].replace(/\.git$/i, '') };
        } catch {
            return null;
        }
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
