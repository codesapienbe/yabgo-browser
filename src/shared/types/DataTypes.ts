/**
 * Data type definitions for YABGO Browser
 */

/**
 * Page metadata stored in database
 */
export interface PageMetadata {
    id?: number;
    url: string;
    title: string;
    description?: string;
    keywords?: string;
    content_snippet: string;
    visit_timestamp: string;
    visit_count?: number;
    favicon_url?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Options for history search
 */
export interface HistorySearchOptions {
    limit?: number;
    sortBy?: 'timestamp' | 'visit_count' | 'title';
    sortOrder?: 'asc' | 'desc';
}

/**
 * Assistant response types
 */
export interface AssistantResponse {
    type: 'info' | 'results' | 'error' | 'navigate';
    message?: string;
    title?: string;
    items?: PageMetadata[];
    url?: string;
}

/**
 * Browser navigation history entry
 */
export interface NavigationEntry {
    url: string;
    title: string;
    timestamp: string;
}

/**
 * Application settings
 */
export interface AppSettings {
    theme: 'light' | 'dark' | 'auto';
    defaultSearchEngine: string;
    gesturesEnabled: boolean;
    floatingUIEnabled: boolean;
    autoHideTimeout: number;
}

/**
 * Gesture configuration
 */
export interface GestureConfig {
    enabled: boolean;
    threshold: number;
    zones: {
        leftCorner: boolean;
        rightCorner: boolean;
        topEdge: boolean;
        bottomEdge: boolean;
    };
}

/**
 * Browser tab interface
 */
export interface Tab {
    id: string;
    title: string;
    url: string;
    isActive: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    isLoading: boolean;
    favicon?: string;
}

/**
 * Tab creation options
 */
export interface TabCreationOptions {
    url?: string;
    title?: string;
    activate?: boolean;
}
