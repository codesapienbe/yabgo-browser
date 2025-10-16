import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { WindowManager } from './WindowManager';
import { DatabaseManager } from './DatabaseManager';
import { AssistantService } from '../services/AssistantService';
import { PageMetadata, AssistantResponse } from '../../shared/types/DataTypes';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages Inter-Process Communication between main and renderer processes
 */
export class IPCManager {
    private databaseManager: DatabaseManager;
    private assistantService: AssistantService;
    private windowManager: WindowManager;
    private logger: Logger;

    constructor(databaseManager: DatabaseManager) {
        this.databaseManager = databaseManager;
        this.assistantService = new AssistantService(databaseManager);
        this.windowManager = new WindowManager();
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

        this.logger.info('IPC handlers setup completed');
    }

    /**
     * Handle saving page metadata
     */
    private async handleSaveMetadata(
        event: IpcMainInvokeEvent,
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
        event: IpcMainInvokeEvent,
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
    private async handleGetStatistics(event: IpcMainInvokeEvent): Promise<{ totalPages: number; totalVisits: number }> {
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
        event: IpcMainInvokeEvent,
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
    private async handleMinimizeWindow(event: IpcMainInvokeEvent): Promise<void> {
        this.windowManager.minimizeWindow();
    }

    /**
     * Handle window maximize/restore
     */
    private async handleMaximizeWindow(event: IpcMainInvokeEvent): Promise<void> {
        this.windowManager.toggleMaximizeWindow();
    }

    /**
     * Handle window close
     */
    private async handleCloseWindow(event: IpcMainInvokeEvent): Promise<void> {
        this.windowManager.closeWindow();
    }
}
