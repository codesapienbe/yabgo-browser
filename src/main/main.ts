import { app, BrowserWindow } from 'electron';
import { WindowManager } from './managers/WindowManager';
import { DatabaseManager } from './managers/DatabaseManager';
import { MCPClientManager } from './managers/MCPClientManager';
import { MCPContextManager } from './managers/MCPContextManager';
import { IPCManager } from './managers/IPCManager';
import { Logger } from '../shared/utils/Logger';
import { DEFAULT_MCP_SERVERS, createDefaultServerConfig, shouldInitializeDefaults } from '../shared/utils/DefaultMCPServers';

/**
 * Main application class - Entry point for YABGO Browser
 */
class YabgoApp {
    private windowManager: WindowManager;
    private readonly databaseManager: DatabaseManager;
    private readonly mcpClientManager: MCPClientManager;
    private readonly mcpContextManager: MCPContextManager;
    private ipcManager: IPCManager;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('YabgoApp');
        this.logger.info('Initializing YABGO Browser...');

        this.databaseManager = new DatabaseManager();
        this.mcpClientManager = new MCPClientManager();
        this.mcpContextManager = new MCPContextManager();
        this.windowManager = new WindowManager();
        // Pass managers into IPCManager
        this.ipcManager = new IPCManager(
            this.databaseManager,
            this.windowManager,
            this.mcpClientManager,
            this.mcpContextManager
        );
    }

    /**
     * Initialize the application
     */
    public async initialize(): Promise<void> {
        try {
            await this.databaseManager.initialize();
            await this.initializeDefaultMCPServers();
            this.setupEventListeners();
            this.logger.info('YABGO Browser initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize application:', error);
            throw error;
        }
    }

    /**
     * Initialize default MCP servers on first run
     */
    private async initializeDefaultMCPServers(): Promise<void> {
        try {
            const existingServers = this.databaseManager.getMCPServers();

            if (shouldInitializeDefaults(existingServers)) {
                this.logger.info('Initializing default MCP servers...');

                for (const defaultServer of DEFAULT_MCP_SERVERS) {
                    const serverConfig = createDefaultServerConfig(defaultServer);
                    this.databaseManager.saveMCPServer(serverConfig);
                    this.logger.info(`Added default MCP server: ${serverConfig.name}`);
                }

                this.logger.info('Default MCP servers initialized successfully');
            }
        } catch (error) {
            this.logger.error('Failed to initialize default MCP servers:', error);
            // Don't throw - this is not critical for app startup
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
        this.mcpClientManager.cleanup().catch(err => {
            this.logger.error('Error during MCP cleanup:', err);
        });
        this.databaseManager.close();
    }
}

// Application entry point
const yabgoApp = new YabgoApp();
yabgoApp.initialize().catch((error) => {
    console.error('Failed to start YABGO Browser:', error);
    process.exit(1);
});
