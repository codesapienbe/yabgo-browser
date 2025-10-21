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
            // Ensure any enabled MCP servers saved in the database are connected on startup
            await this.connectEnabledMCPServers();
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
     * Connect to saved MCP servers that are marked enabled in the database.
     * Normalizes missing fields and attempts to connect each server. Failures are logged
     * but do not block app startup.
     */
    private async connectEnabledMCPServers(): Promise<void> {
        try {
            const saved = this.databaseManager.getMCPServers();
            if (!saved || saved.length === 0) return;

            this.logger.info(`Attempting to connect to ${saved.length} saved MCP server(s)`);

            for (const s of saved) {
                try {
                    // Normalize fields that may be missing from older DB entries
                    const cfg = {
                        ...s,
                        supervise: (s as any).supervise ?? false,
                        cwd: (s as any).cwd ?? undefined,
                        env: (s as any).env ?? undefined,
                        args: (s as any).args ?? undefined,
                    };

                    if (!cfg.enabled) {
                        this.logger.debug(`Skipping disabled MCP server on startup: ${cfg.name}`);
                        continue;
                    }

                    const ok = await this.mcpClientManager.connectToServer(cfg);
                    if (ok) {
                        // Persist any normalized fields back to DB (non-destructive)
                        try {
                            this.databaseManager.saveMCPServer(cfg);
                        } catch (err) {
                            this.logger.warn('Failed to persist normalized MCP server config:', err);
                        }
                        this.logger.info(`Connected to MCP server on startup: ${cfg.name}`);
                    } else {
                        this.logger.warn(`Failed to connect to MCP server on startup: ${cfg.name}`);
                    }
                } catch (err) {
                    this.logger.error('Error while connecting saved MCP server:', err);
                }
            }
        } catch (err) {
            this.logger.error('Failed to connect enabled MCP servers on startup:', err);
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

        // Ensure supervised child processes are cleaned up on process exit
        process.on('exit', () => {
            this.cleanup();
        });

        // Also try to kill supervised child processes on SIGINT/SIGTERM
        process.on('SIGINT', () => {
            this.cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            this.cleanup();
            process.exit(0);
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
