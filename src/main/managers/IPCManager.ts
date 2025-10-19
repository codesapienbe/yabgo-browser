import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { WindowManager } from './WindowManager';
import { DatabaseManager } from './DatabaseManager';
import { MCPClientManager } from './MCPClientManager';
import { MCPContextManager } from './MCPContextManager';
import { AssistantService } from '../services/AssistantService';
import { PageMetadata, AssistantResponse } from '../../shared/types/DataTypes';
import { MCPServerConfig, MCPToolCall } from '../../types/mcp.types';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages Inter-Process Communication between main and renderer processes
 */
export class IPCManager {
    private databaseManager: DatabaseManager;
    private assistantService: AssistantService;
    private windowManager: WindowManager;
    private mcpClientManager: MCPClientManager;
    private mcpContextManager: MCPContextManager;
    private logger: Logger;

    constructor(
        databaseManager: DatabaseManager,
        windowManager: WindowManager,
        mcpClientManager: MCPClientManager,
        mcpContextManager: MCPContextManager
    ) {
        this.databaseManager = databaseManager;
        this.assistantService = new AssistantService(databaseManager);
        // Use the WindowManager instance provided by the app instead of creating a new one
        this.windowManager = windowManager;
        this.mcpClientManager = mcpClientManager;
        this.mcpContextManager = mcpContextManager;
        this.logger = new Logger('IPCManager');
    }

    /**
     * Setup IPC handlers
     */
    public setupHandlers(): void {
        // Database operations
        ipcMain.handle('db:save-metadata', this.handleSaveMetadata.bind(this));
        ipcMain.handle('db:get-history', this.handleGetHistory.bind(this));
        ipcMain.handle('db:get-statistics', this.handleGetStatistics.bind(this));

        // Assistant operations
        ipcMain.handle('assistant:query', this.handleAssistantQuery.bind(this));

        // Window operations
        ipcMain.handle('window:minimize', this.handleMinimizeWindow.bind(this));
        ipcMain.handle('window:maximize', this.handleMaximizeWindow.bind(this));
        ipcMain.handle('window:close', this.handleCloseWindow.bind(this));

        // MCP operations
        this.setupMCPHandlers();

        this.logger.info('IPC handlers setup completed');
    }

    /**
     * Handle saving page metadata
     */
    private async handleSaveMetadata(
        _event: IpcMainInvokeEvent,
        metadata: PageMetadata
    ): Promise<{ success: boolean; error?: string }> {
        try {
            this.databaseManager.insertOrUpdateMetadata(metadata);
            return { success: true };
        } catch (error) {
            this.logger.error('Error saving metadata:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Handle getting browsing history
     */
    private async handleGetHistory(
        _event: IpcMainInvokeEvent,
        limit: number = 50
    ): Promise<PageMetadata[]> {
        try {
            return this.databaseManager.getRecentPages(limit);
        } catch (error) {
            this.logger.error('Error getting history:', error);
            return [];
        }
    }

    /**
     * Handle getting database statistics
     */
    private async handleGetStatistics(_event: IpcMainInvokeEvent): Promise<{ totalPages: number; totalVisits: number }> {
        try {
            return this.databaseManager.getStatistics();
        } catch (error) {
            this.logger.error('Error getting statistics:', error);
            return { totalPages: 0, totalVisits: 0 };
        }
    }

    /**
     * Handle assistant queries
     */
    private async handleAssistantQuery(
        _event: IpcMainInvokeEvent,
        query: string
    ): Promise<AssistantResponse> {
        try {
            return await this.assistantService.processQuery(query);
        } catch (error) {
            this.logger.error('Assistant query error:', error);
            return {
                type: 'error',
                message: `Assistant encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Handle window minimize
     */
    private async handleMinimizeWindow(_event: IpcMainInvokeEvent): Promise<void> {
        this.windowManager.minimizeWindow();
    }

    /**
     * Handle window maximize/restore
     */
    private async handleMaximizeWindow(_event: IpcMainInvokeEvent): Promise<void> {
        this.windowManager.toggleMaximizeWindow();
    }

    /**
     * Handle window close
     */
    private async handleCloseWindow(_event: IpcMainInvokeEvent): Promise<void> {
        this.windowManager.closeWindow();
    }

    /**
     * Setup MCP-specific IPC handlers
     */
    private setupMCPHandlers(): void {
        // Connect to MCP server
        ipcMain.handle('mcp:connect-server', async (_event, config: MCPServerConfig) => {
            try {
                this.logger.info('[IPC] Connecting to MCP server', { serverName: config.name });
                const success = await this.mcpClientManager.connectToServer(config);
                if (success) {
                    this.databaseManager.saveMCPServer(config);
                }
                return { success, serverId: config.id };
            } catch (error) {
                this.logger.error('[IPC] MCP connect error:', error, { serverId: config.id });
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Disconnect from MCP server
        ipcMain.handle('mcp:disconnect-server', async (_event, serverId: string) => {
            try {
                await this.mcpClientManager.disconnectServer(serverId);
                return { success: true };
            } catch (error) {
                this.logger.error('[IPC] MCP disconnect error:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Discover tools
        ipcMain.handle('mcp:discover-tools', async (_event, serverId: string) => {
            try {
                const tools = await this.mcpClientManager.discoverTools(serverId);
                return { success: true, tools };
            } catch (error) {
                this.logger.error('[IPC] MCP discover tools error:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Call tool
        ipcMain.handle('mcp:call-tool', async (_event, toolCall: MCPToolCall) => {
            try {
                const result = await this.mcpClientManager.callTool(toolCall);
                this.databaseManager.saveMCPToolCall(toolCall.serverId, toolCall, result);
                return result;
            } catch (error) {
                this.logger.error('[IPC] MCP call tool error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: Date.now()
                };
            }
        });

        // Get saved servers
        ipcMain.handle('mcp:get-servers', async () => {
            try {
                const servers = this.databaseManager.getMCPServers();
                return { success: true, servers };
            } catch (error) {
                this.logger.error('[IPC] MCP get servers error:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Delete server
        ipcMain.handle('mcp:delete-server', async (_event, serverId: string) => {
            try {
                await this.mcpClientManager.disconnectServer(serverId);
                this.databaseManager.deleteMCPServer(serverId);
                return { success: true };
            } catch (error) {
                this.logger.error('[IPC] MCP delete server error:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Extract and update context
        ipcMain.handle('mcp:update-context', async (_event, data: { url: string; title: string; selection?: string }) => {
            try {
                const context = this.mcpContextManager.extractContext(data);
                return { success: true, context };
            } catch (error) {
                this.logger.error('[IPC] MCP update context error:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Get current context
        ipcMain.handle('mcp:get-context', async () => {
            try {
                const context = this.mcpContextManager.getCurrentContext();
                return { success: true, context };
            } catch (error) {
                this.logger.error('[IPC] MCP get context error:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Get context history
        ipcMain.handle('mcp:get-context-history', async (_event, limit?: number) => {
            try {
                const history = this.mcpContextManager.getContextHistory(limit);
                return { success: true, history };
            } catch (error) {
                this.logger.error('[IPC] MCP get context history error:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });

        // Forward MCP events to renderer
        this.mcpClientManager.on('server-connected', (serverId) => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('mcp:server-connected', serverId);
            }
        });

        this.mcpClientManager.on('tools-discovered', (data) => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('mcp:tools-discovered', data);
            }
        });

        this.mcpClientManager.on('error', (data) => {
            const mainWindow = this.windowManager.getMainWindow();
            if (mainWindow) {
                mainWindow.webContents.send('mcp:error', data);
            }
        });

        this.logger.info('MCP IPC handlers setup completed');
    }
}
