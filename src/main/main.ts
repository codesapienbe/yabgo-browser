import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { WindowManager } from './managers/WindowManager';
import { DatabaseManager } from './managers/DatabaseManager';
import { IPCManager } from './managers/IPCManager';
import { Logger } from '../shared/utils/Logger';

/**
 * Main application class - Entry point for YABGO Browser
 */
class YabgoApp {
    private windowManager: WindowManager;
    private databaseManager: DatabaseManager;
    private ipcManager: IPCManager;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('YabgoApp');
        this.logger.info('Initializing YABGO Browser...');

        this.databaseManager = new DatabaseManager();
        this.windowManager = new WindowManager();
        this.ipcManager = new IPCManager(this.databaseManager);
    }

    /**
     * Initialize the application
     */
    public async initialize(): Promise<void> {
        try {
            await this.databaseManager.initialize();
            this.setupEventListeners();
            this.logger.info('YABGO Browser initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize application:', error);
            throw error;
        }
    }

    /**
     * Setup application event listeners
     */
    private setupEventListeners(): void {
        app.whenReady().then(() => {
            this.windowManager.createMainWindow();
            this.ipcManager.setupHandlers();
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.windowManager.createMainWindow();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanup();
                app.quit();
            }
        });

        app.on('before-quit', () => {
            this.cleanup();
        });
    }

    /**
     * Cleanup resources before shutdown
     */
    private cleanup(): void {
        this.logger.info('Cleaning up resources...');
        this.databaseManager.close();
    }
}

// Application entry point
const yabgoApp = new YabgoApp();
yabgoApp.initialize().catch((error) => {
    console.error('Failed to start YABGO Browser:', error);
    process.exit(1);
});
