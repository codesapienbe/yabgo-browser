import { app } from 'electron';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Bundled MCP server configurations with their package paths
 */
export const BUNDLED_MCP_SERVERS = {
    'filesystem': {
        package: '@modelcontextprotocol/server-filesystem',
        entryPoint: 'dist/index.js',
    },
    'memory': {
        package: '@modelcontextprotocol/server-memory',
        entryPoint: 'dist/index.js',
    },
    'everything': {
        package: '@modelcontextprotocol/server-everything',
        entryPoint: 'dist/index.js',
    },
    'sequential-thinking': {
        package: '@modelcontextprotocol/server-sequential-thinking',
        entryPoint: 'dist/index.js',
    },
} as const;

export type BundledServerName = keyof typeof BUNDLED_MCP_SERVERS;

/**
 * Get the base path for node_modules depending on whether the app is packaged
 */
export function getNodeModulesPath(): string {
    if (app.isPackaged) {
        // In production, node_modules is in the app.asar or resources folder
        return join(app.getAppPath(), 'node_modules');
    } else {
        // In development, use the project's node_modules
        return join(__dirname, '..', '..', '..', 'node_modules');
    }
}

/**
 * Resolve the full path to a bundled MCP server's entry point
 */
export function resolveBundledServer(serverName: BundledServerName): string | null {
    const serverConfig = BUNDLED_MCP_SERVERS[serverName];
    if (!serverConfig) {
        return null;
    }

    const nodeModulesPath = getNodeModulesPath();
    const serverPath = join(nodeModulesPath, serverConfig.package, serverConfig.entryPoint);

    if (existsSync(serverPath)) {
        return serverPath;
    }

    console.warn(`[MCP] Bundled server not found: ${serverPath}`);
    return null;
}

/**
 * Get the Node.js executable path
 * In Electron, we use process.execPath which points to the Electron binary,
 * but we can run Node scripts with it since Electron embeds Node.js
 */
export function getNodeExecutable(): string {
    // Electron's process.execPath can run Node.js scripts directly
    return process.execPath;
}

/**
 * Check if a server is bundled with the app
 */
export function isBundledServer(serverName: string): serverName is BundledServerName {
    return serverName in BUNDLED_MCP_SERVERS;
}
