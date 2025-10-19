import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { PageMetadata, AssistantResponse } from '../shared/types/DataTypes';
import type { MCPServerConfig, MCPToolCall } from '../types/mcp.types';

/**
 * Preload script - Exposes secure API to renderer process
 */

// Define the API interface
export interface YabgoAPI {
    // Database operations
    savePageMetadata: (metadata: PageMetadata) => Promise<{ success: boolean; error?: string }>;
    getHistory: (limit?: number) => Promise<PageMetadata[]>;
    getStatistics: () => Promise<{ totalPages: number; totalVisits: number }>;

    // Assistant operations
    assistantQuery: (query: string) => Promise<AssistantResponse>;

    // Window operations
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;

    // Event listeners
    onWindowEvent: (callback: (event: string, data?: any) => void) => void;
    removeAllListeners: () => void;

    // MCP operations
    mcp: {
        connectServer: (config: MCPServerConfig) => Promise<{ success: boolean; serverId?: string; error?: string }>;
        disconnectServer: (serverId: string) => Promise<{ success: boolean; error?: string }>;
        discoverTools: (serverId: string) => Promise<{ success: boolean; tools?: any[]; error?: string }>;
        callTool: (toolCall: MCPToolCall) => Promise<any>;
        getServers: () => Promise<{ success: boolean; servers?: MCPServerConfig[]; error?: string }>;
        deleteServer: (serverId: string) => Promise<{ success: boolean; error?: string }>;
        updateContext: (data: { url: string; title: string; selection?: string }) => Promise<{ success: boolean; context?: any; error?: string }>;
        getContext: () => Promise<{ success: boolean; context?: any; error?: string }>;
        getContextHistory: (limit?: number) => Promise<{ success: boolean; history?: any[]; error?: string }>;
        // Enable/disable server
        setServerEnabled: (config: MCPServerConfig, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
        // Get supervised server status
        getServerStatus: (serverId: string) => Promise<{ success: boolean; status?: { pid: number | null; attempts: number; lastStderr?: string }; error?: string }>;
        onServerConnected: (callback: (serverId: string) => void) => () => void;
        onToolsDiscovered: (callback: (data: any) => void) => () => void;
        onError: (callback: (data: any) => void) => () => void;
    };
}

// Expose the API to the renderer process
const yabgoAPI: YabgoAPI = {
    // Database operations
    savePageMetadata: (metadata: PageMetadata) =>
        ipcRenderer.invoke('db:save-metadata', metadata),

    getHistory: (limit?: number) =>
        ipcRenderer.invoke('db:get-history', limit),

    getStatistics: () =>
        ipcRenderer.invoke('db:get-statistics'),

    // Assistant operations
    assistantQuery: (query: string) =>
        ipcRenderer.invoke('assistant:query', query),

    // Window operations
    minimizeWindow: () =>
        ipcRenderer.invoke('window:minimize'),

    maximizeWindow: () =>
        ipcRenderer.invoke('window:maximize'),

    closeWindow: () =>
        ipcRenderer.invoke('window:close'),

    // Event listeners
    onWindowEvent: (callback: (event: string, data?: any) => void) => {
        const handleEvent = (_event: IpcRendererEvent, eventName: string, data?: any) => {
            callback(eventName, data);
        };
        ipcRenderer.on('window-event', handleEvent);
    },

    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('window-event');
    },

    // MCP operations
    mcp: {
        connectServer: (config: MCPServerConfig) =>
            ipcRenderer.invoke('mcp:connect-server', config),

        disconnectServer: (serverId: string) =>
            ipcRenderer.invoke('mcp:disconnect-server', serverId),

        discoverTools: (serverId: string) =>
            ipcRenderer.invoke('mcp:discover-tools', serverId),

        callTool: (toolCall: MCPToolCall) =>
            ipcRenderer.invoke('mcp:call-tool', toolCall),

        getServers: () =>
            ipcRenderer.invoke('mcp:get-servers'),

        deleteServer: (serverId: string) =>
            ipcRenderer.invoke('mcp:delete-server', serverId),

        getServerStatus: (serverId: string) =>
            ipcRenderer.invoke('mcp:get-server-status', serverId),

        updateContext: (data: { url: string; title: string; selection?: string }) =>
            ipcRenderer.invoke('mcp:update-context', data),

        getContext: () =>
            ipcRenderer.invoke('mcp:get-context'),

        getContextHistory: (limit?: number) =>
            ipcRenderer.invoke('mcp:get-context-history', limit),

        // Enable/disable server
        setServerEnabled: (config: MCPServerConfig, enabled: boolean) =>
            ipcRenderer.invoke('mcp:set-server-enabled', config, enabled),

        onServerConnected: (callback: (serverId: string) => void) => {
            const handler = (_event: IpcRendererEvent, serverId: string) => callback(serverId);
            ipcRenderer.on('mcp:server-connected', handler);
            return () => ipcRenderer.removeListener('mcp:server-connected', handler);
        },

        onToolsDiscovered: (callback: (data: any) => void) => {
            const handler = (_event: IpcRendererEvent, data: any) => callback(data);
            ipcRenderer.on('mcp:tools-discovered', handler);
            return () => ipcRenderer.removeListener('mcp:tools-discovered', handler);
        },

        onError: (callback: (data: any) => void) => {
            const handler = (_event: IpcRendererEvent, data: any) => callback(data);
            ipcRenderer.on('mcp:error', handler);
            return () => ipcRenderer.removeListener('mcp:error', handler);
        }
    }
};

// Expose the API
contextBridge.exposeInMainWorld('yabgo', yabgoAPI);

// Type declaration for window object
declare global {
    interface Window {
        yabgo: YabgoAPI;
    }
}

// Export to make this file a module
export { };
