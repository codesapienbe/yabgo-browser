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
            this.logger.debug('DOM loaded, starting renderer initialization...');
            this.logger.info('Initializing YABGO Browser UI...');
            this.logger.debug('Creating BrowserApp instance...');
            await this.app.initialize();
            this.logger.info('YABGO Browser UI initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize renderer:', error);
            this.logger.error('Error details:', error);
            throw error;
        }
    }
}

// Utility: fade out and remove splash element (returns when removed or immediately if no element)
async function fadeOutSplash(splashEl: HTMLElement | null, timeout = 700): Promise<void> {
    if (!splashEl) return;

    try {
        // set accessible state and start fade
        splashEl.setAttribute('aria-hidden', 'true');
        splashEl.classList.add('fade-out');

        // Wait for the CSS transition to finish, with a safety timeout
        await new Promise<void>((resolve) => {
            let invoked = false;
            const done = () => {
                if (invoked) return;
                invoked = true;
                try { splashEl.remove(); } catch { /* ignore */ }
                resolve();
            };

            // Try to listen for transitionend
            const onTransitionEnd = (ev: TransitionEvent) => {
                // Only resolve for opacity/transform transitions coming from the splash element
                if (ev.target === splashEl) {
                    splashEl.removeEventListener('transitionend', onTransitionEnd as EventListener);
                    done();
                }
            };

            splashEl.addEventListener('transitionend', onTransitionEnd as EventListener);

            // Fallback safety timeout
            setTimeout(() => {
                try { splashEl.removeEventListener('transitionend', onTransitionEnd as EventListener); } catch { /* ignore */ }
                done();
            }, timeout);
        });
    } catch (e) {
        try { splashEl.remove(); } catch { /* ignore */ }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.debug('[RendererMain] DOMContentLoaded event fired');
    const splashEl = document.getElementById('splash');
    const rendererMain = new RendererMain();

    try {
        console.debug('[RendererMain] Starting initialization...');
        await rendererMain.initialize();
        // Fade out splash then remove it
        await fadeOutSplash(splashEl);
        console.debug('[RendererMain] Initialization complete');
    } catch (error) {
        // Fade out the splash (if present) before displaying error UI so users see a smooth transition
        try {
            await fadeOutSplash(splashEl);
        } catch (e) {
            // ignore fade errors
        }

        console.error('Failed to start YABGO Browser UI:', error);
        console.error('Error stack:', (error as Error).stack);

        // Show error message to user with more details
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';

        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #1a1a1a; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 20px;">
                <div style="max-width: 800px; text-align: center;">
                    <h1 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Initialization Error</h1>
                    <p style="margin-bottom: 10px;">Failed to initialize YABGO Browser</p>
                    <div style="background: #2a2a2a; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: left;">
                        <div style="color: #f39c12; font-weight: bold; margin-bottom: 10px;">Error:</div>
                        <div style="color: #e74c3c; font-family: monospace; font-size: 12px; word-break: break-word;">${errorMessage}</div>
                        ${errorStack ? `
                        <div style="color: #95a5a6; font-family: monospace; font-size: 10px; margin-top: 10px; max-height: 200px; overflow: auto;">
                            ${errorStack.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                        </div>
                        ` : ''}
                    </div>
                    <p style="color: #95a5a6; font-size: 12px; margin-top: 20px;">Open DevTools (F12) for more details</p>
                </div>
            </div>
        `;
    }
});
