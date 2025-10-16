import { BrowserWindow } from 'electron';
import * as path from 'path';
import { WindowConfig } from '../../shared/types/WindowTypes';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages application windows
 */
export class WindowManager {
    private mainWindow: BrowserWindow | null = null;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('WindowManager');
    }

    /**
     * Create the main application window
     */
    public createMainWindow(): void {
        const config: WindowConfig = {
            width: 1400,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            titleBarStyle: 'hiddenInset',
            frame: false,
            webPreferences: {
                preload: path.join(__dirname, '../preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                webviewTag: true,
                webSecurity: true,
                allowRunningInsecureContent: false
            }
        };

        this.mainWindow = new BrowserWindow(config);

        // Load the HTML file from the correct location
        const htmlPath = path.join(__dirname, '../../index.html');
        this.logger.info(`Loading HTML from: ${htmlPath}`);
        this.mainWindow.loadFile(htmlPath);
        this.mainWindow.setMenuBarVisibility(false);

        // Always open DevTools to debug layout issues
        this.mainWindow.webContents.openDevTools();

        this.setupWindowEvents();

        this.logger.info('Main window created successfully');
    }

    /**
     * Setup window event listeners
     */
    private setupWindowEvents(): void {
        if (!this.mainWindow) return;

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
            this.logger.info('Main window closed');
        });

        this.mainWindow.on('ready-to-show', () => {
            this.mainWindow?.show();
            this.logger.info('Main window ready to show');
        });

        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            this.logger.info(`Handling window open request: ${url}`);
            return { action: 'deny' };
        });
    }

    /**
     * Get the main window instance
     */
    public getMainWindow(): BrowserWindow | null {
        return this.mainWindow;
    }

    /**
     * Minimize the main window
     */
    public minimizeWindow(): void {
        this.mainWindow?.minimize();
    }

    /**
     * Maximize or unmaximize the main window
     */
    public toggleMaximizeWindow(): void {
        if (this.mainWindow?.isMaximized()) {
            this.mainWindow.unmaximize();
        } else {
            this.mainWindow?.maximize();
        }
    }

    /**
     * Close the main window
     */
    public closeWindow(): void {
        this.mainWindow?.close();
    }
}
