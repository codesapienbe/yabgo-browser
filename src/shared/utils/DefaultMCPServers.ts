import { MCPServerConfig } from '../../types/mcp.types';

/**
 * Default MCP servers that are pre-configured for generic users
 * These servers provide commonly useful functionality out of the box
 */
export const DEFAULT_MCP_SERVERS: Omit<MCPServerConfig, 'id' | 'createdAt'>[] = [
    {
        name: 'Filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', process.env.HOME || '/home'],
        enabled: true,
        supervise: true,
        permissions: {
            shareHistory: false,
            sharePageContent: false,
            shareSelections: true,
            allowedDomains: [],
        },
    },
    {
        name: 'Memory',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        enabled: true,
        supervise: true,
        permissions: {
            shareHistory: true,
            sharePageContent: false,
            shareSelections: true,
            allowedDomains: [],
        },
    },
    {
        name: 'Brave Search',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-brave-search'],
        env: {
            // Users will need to set BRAVE_API_KEY environment variable
            BRAVE_API_KEY: process.env.BRAVE_API_KEY || '',
        },
        enabled: false, // Disabled by default as it requires API key
        supervise: true,
        permissions: {
            shareHistory: false,
            sharePageContent: true,
            shareSelections: true,
            allowedDomains: [],
        },
    },
    {
        name: 'Everything',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-everything'],
        enabled: true,
        supervise: true,
        permissions: {
            shareHistory: false,
            sharePageContent: false,
            shareSelections: false,
            allowedDomains: [],
        },
    },
    {
        name: 'Starter',
        command: 'npx',
        args: ['-y', 'mcp-starter'],
        enabled: true,
        supervise: true,
        permissions: {
            shareHistory: false,
            sharePageContent: false,
            shareSelections: false,
            allowedDomains: [],
        },
    },
    {
        name: 'SequentialThinking',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
        enabled: true,
        supervise: true,
        permissions: {
            shareHistory: false,
            sharePageContent: false,
            shareSelections: false,
            allowedDomains: [],
        },
    },
];

/**
 * Generates a complete MCPServerConfig from the default template
 */
export function createDefaultServerConfig(defaultServer: typeof DEFAULT_MCP_SERVERS[0]): MCPServerConfig {
    return {
        id: `mcp-default-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...defaultServer,
        createdAt: Date.now(),
    };
}

/**
 * Checks if default servers have been initialized
 */
export function shouldInitializeDefaults(existingServers: MCPServerConfig[]): boolean {
    // If there are no servers at all, initialize defaults
    if (existingServers.length === 0) {
        return true;
    }

    // Check if any default servers exist by name
    const defaultNames = DEFAULT_MCP_SERVERS.map(s => s.name);
    const hasAnyDefault = existingServers.some(s =>
        defaultNames.includes(s.name)
    );

    // Don't initialize if user already has default servers
    return !hasAnyDefault;
}

