import { BrowserApp } from './core/BrowserApp';
import { Logger } from '../shared/utils/Logger';

/**
 * Renderer process entry point
 */
class RendererMain {
    private app: BrowserApp;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('RendererMain');
        this.app = new BrowserApp();
    }

    /**
     * Initialize the renderer application
     */
    public async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing YABGO Browser UI...');
            await this.app.initialize();
            this.logger.info('YABGO Browser UI initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize renderer:', error);
            throw error;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const rendererMain = new RendererMain();

    try {
        await rendererMain.initialize();
    } catch (error) {
        console.error('Failed to start YABGO Browser UI:', error);

        // Show error message to user
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
                <div style="text-align: center;">
                    <h1 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Error</h1>
                    <p>Failed to initialize YABGO Browser</p>
                    <p style="color: #95a5a6; font-size: 12px; margin-top: 20px;">Check the console for more details</p>
                </div>
            </div>
        `;
    }
});
