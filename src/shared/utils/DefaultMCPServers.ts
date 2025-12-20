import { MCPServerConfig } from '../../types/mcp.types';

/**
 * Default MCP servers that are pre-configured for generic users
 * These servers are bundled with the app for reliable operation without external dependencies
 */
export const DEFAULT_MCP_SERVERS: Omit<MCPServerConfig, 'id' | 'createdAt'>[] = [
    {
        name: 'Filesystem',
        command: 'node', // Will be resolved to bundled server
        args: [process.env.HOME || '/home'], // Server-specific args (allowed directory)
        bundledServer: 'filesystem',
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
        command: 'node',
        args: [],
        bundledServer: 'memory',
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
        name: 'Everything',
        command: 'node',
        args: [],
        bundledServer: 'everything',
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
        command: 'node',
        args: [],
        bundledServer: 'sequential-thinking',
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
