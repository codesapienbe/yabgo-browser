import type { MCPServerConfig, MCPToolCall, MCPToolResult } from '../../types/mcp.types';

/**
 * Bridge for MCP IPC communication between renderer and main process
 */
export class MCPBridge {
    async connectServer(config: MCPServerConfig): Promise<{ success: boolean; serverId?: string; error?: string }> {
        return await window.yabgo.mcp.connectServer(config);
    }

    async disconnectServer(serverId: string): Promise<{ success: boolean; error?: string }> {
        return await window.yabgo.mcp.disconnectServer(serverId);
    }

    async discoverTools(serverId: string): Promise<{ success: boolean; tools?: any[]; error?: string }> {
        return await window.yabgo.mcp.discoverTools(serverId);
    }

    async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
        return await window.yabgo.mcp.callTool(toolCall);
    }

    async getServers(): Promise<{ success: boolean; servers?: MCPServerConfig[]; error?: string }> {
        return await window.yabgo.mcp.getServers();
    }

    async setServerEnabled(config: MCPServerConfig, enabled: boolean): Promise<{ success: boolean; error?: string }> {
        return await window.yabgo.mcp.setServerEnabled(config, enabled);
    }

    async getServerStatus(serverId: string): Promise<{ success: boolean; status?: { pid: number | null; attempts: number; lastStderr?: string }; error?: string }> {
        return await window.yabgo.mcp.getServerStatus(serverId);
    }

    async deleteServer(serverId: string): Promise<{ success: boolean; error?: string }> {
        return await window.yabgo.mcp.deleteServer(serverId);
    }

    async updateContext(data: { url: string; title: string; selection?: string }): Promise<{ success: boolean; context?: any; error?: string }> {
        return await window.yabgo.mcp.updateContext(data);
    }

    async getContext(): Promise<{ success: boolean; context?: any; error?: string }> {
        return await window.yabgo.mcp.getContext();
    }

    async getContextHistory(limit?: number): Promise<{ success: boolean; history?: any[]; error?: string }> {
        return await window.yabgo.mcp.getContextHistory(limit);
    }

    onServerConnected(callback: (serverId: string) => void): () => void {
        return window.yabgo.mcp.onServerConnected(callback);
    }

    onToolsDiscovered(callback: (data: any) => void): () => void {
        return window.yabgo.mcp.onToolsDiscovered(callback);
    }

    onError(callback: (data: any) => void): () => void {
        return window.yabgo.mcp.onError(callback);
    }
}

// Singleton instance
export const mcpBridge = new MCPBridge();

