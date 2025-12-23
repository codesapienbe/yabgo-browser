import { BrowserWindow } from 'electron';
import fs from 'fs';
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
        // Choose an appropriate icon for the current platform. When running from
        // source during development the assets live at the project root `assets/`.
        // When packaged by electron-builder the `assets` directory is copied into
        // the app resources; resolve accordingly.
        const iconPath = (() => {
            // In packaged apps __dirname will be inside the asar or resources dir.
            const possiblePackaged = path.join(process.resourcesPath || __dirname, 'assets', process.platform === 'darwin' ? 'app.icns' : 'app.ico');
            const devPath = path.join(__dirname, '..', '..', 'assets', process.platform === 'darwin' ? 'app.icns' : 'app.ico');
            try {
                // Prefer packaged asset when available
                if (fs.existsSync(possiblePackaged)) return possiblePackaged;
            } catch (e) {
                // ignore errors when checking for packaged asset
            }
            // Fallback to project assets during development
            return devPath;
        })();

        const config: WindowConfig = {
            width: 1400,
            height: 900,
            minWidth: 800,
            minHeight: 600,
            titleBarStyle: 'hiddenInset',
            frame: false,
            icon: iconPath,
            webPreferences: {
                preload: path.join(__dirname, '../preload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                webviewTag: true,
                webSecurity: true,
                allowRunningInsecureContent: false,
                sandbox: false
            }
        };

        this.mainWindow = new BrowserWindow(config);

        // Load the HTML file from the correct location
        const htmlPath = path.join(__dirname, '../../index.html');
        this.logger.info(`Loading HTML from: ${htmlPath}`);
        this.mainWindow.loadFile(htmlPath);
        this.mainWindow.setMenuBarVisibility(false);

        // Start maximized
        this.mainWindow.maximize();

        // Auto-open DevTools removed

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
            this.mainWindow?.focus();
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
