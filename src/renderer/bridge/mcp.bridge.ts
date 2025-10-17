import type { MCPServerConfig, MCPToolCall, MCPToolResult } from '../../types/mcp.types';

/**
 * Bridge for MCP IPC communication between renderer and main process
 */
export class MCPBridge {
    async connectServer(config: MCPServerConfig): Promise<{ success: boolean; serverId?: string; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:connect-server', config);
    }

    async disconnectServer(serverId: string): Promise<{ success: boolean; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:disconnect-server', serverId);
    }

    async discoverTools(serverId: string): Promise<{ success: boolean; tools?: any[]; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:discover-tools', serverId);
    }

    async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:call-tool', toolCall);
    }

    async getServers(): Promise<{ success: boolean; servers?: MCPServerConfig[]; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:get-servers');
    }

    async deleteServer(serverId: string): Promise<{ success: boolean; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:delete-server', serverId);
    }

    async updateContext(data: { url: string; title: string; selection?: string }): Promise<{ success: boolean; context?: any; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:update-context', data);
    }

    async getContext(): Promise<{ success: boolean; context?: any; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:get-context');
    }

    async getContextHistory(limit?: number): Promise<{ success: boolean; history?: any[]; error?: string }> {
        return await (window as any).electron.ipcRenderer.invoke('mcp:get-context-history', limit);
    }

    onServerConnected(callback: (serverId: string) => void): () => void {
        const handler = (_event: any, serverId: string) => callback(serverId);
        (window as any).electron.ipcRenderer.on('mcp:server-connected', handler);
        return () => (window as any).electron.ipcRenderer.removeListener('mcp:server-connected', handler);
    }

    onToolsDiscovered(callback: (data: any) => void): () => void {
        const handler = (_event: any, data: any) => callback(data);
        (window as any).electron.ipcRenderer.on('mcp:tools-discovered', handler);
        return () => (window as any).electron.ipcRenderer.removeListener('mcp:tools-discovered', handler);
    }

    onError(callback: (data: any) => void): () => void {
        const handler = (_event: any, data: any) => callback(data);
        (window as any).electron.ipcRenderer.on('mcp:error', handler);
        return () => (window as any).electron.ipcRenderer.removeListener('mcp:error', handler);
    }
}

// Singleton instance
export const mcpBridge = new MCPBridge();

