import { EventEmitter } from '../utils/EventEmitter';
import { NavigationManager } from './NavigationManager';
import { Logger } from '../../shared/utils/Logger';

/**
 * Manages gesture recognition and handling
 */
export class GestureManager extends EventEmitter {
    private navigationManager: NavigationManager;
    private gestureZones: Map<string, HTMLElement> = new Map();
    private isGesturing: boolean = false;
    private gestureStart: { x: number; y: number } | null = null;
    private logger: Logger;

    private readonly GESTURE_THRESHOLD = 50; // minimum distance for gesture
    private readonly ZONE_SIZE = 80; // gesture zone size

    constructor(navigationManager: NavigationManager) {
        super();
        this.navigationManager = navigationManager;
        this.logger = new Logger('GestureManager');
    }

    /**
     * Initialize gesture manager
     */
    public async initialize(): Promise<void> {
        this.createGestureZones();
        this.setupGestureHandlers();

        this.logger.info('Gesture manager initialized');
    }

    /**
     * Create invisible gesture zones
     */
    private createGestureZones(): void {
        const zones = [
            { id: 'leftGesture', position: 'left' },
            { id: 'rightGesture', position: 'right' },
            { id: 'topGesture', position: 'top' },
            { id: 'bottomGesture', position: 'bottom' }
        ];

        zones.forEach(zone => {
            const element = document.getElementById(zone.id);
            if (element) {
                this.gestureZones.set(zone.position, element);
            }
        });

        this.logger.debug(`Created ${this.gestureZones.size} gesture zones`);
    }

    /**
     * Setup gesture handlers for all zones
     */
    private setupGestureHandlers(): void {
        this.gestureZones.forEach((element, position) => {
            this.setupZoneHandlers(element, position);
        });
    }

    /**
     * Setup handlers for a specific gesture zone
     */
    private setupZoneHandlers(element: HTMLElement, position: string): void {
        // Mouse events (desktop)
        element.addEventListener('mousedown', (e) => {
            this.handleGestureStart(e.clientX, e.clientY, element, position);
        });

        // Touch events (mobile)
        element.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.handleGestureStart(touch.clientX, touch.clientY, element, position);
        });

        // Global mouse/touch move and end events
        document.addEventListener('mousemove', this.handleGestureMove.bind(this));
        document.addEventListener('mouseup', this.handleGestureEnd.bind(this));
        document.addEventListener('touchmove', this.handleGestureMoveTouch.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleGestureEnd.bind(this));
    }

    /**
     * Handle gesture start
     */
    private handleGestureStart(x: number, y: number, element: HTMLElement, position: string): void {
        this.isGesturing = true;
        this.gestureStart = { x, y };
        element.style.pointerEvents = 'all';

        this.logger.debug(`Gesture started in ${position} zone at (${x}, ${y})`);
    }

    /**
     * Handle gesture move (mouse)
     */
    private handleGestureMove(event: MouseEvent): void {
        if (!this.isGesturing || !this.gestureStart) return;

        const deltaX = event.clientX - this.gestureStart.x;
        const deltaY = event.clientY - this.gestureStart.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.GESTURE_THRESHOLD) {
            this.processGesture(deltaX, deltaY);
            this.endGesture();
        }
    }

    /**
     * Handle gesture move (touch)
     */
    private handleGestureMoveTouch(event: TouchEvent): void {
        if (!this.isGesturing || !this.gestureStart) return;

        const touch = event.touches[0];
        const deltaX = touch.clientX - this.gestureStart.x;
        const deltaY = touch.clientY - this.gestureStart.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance > this.GESTURE_THRESHOLD) {
            this.processGesture(deltaX, deltaY);
            this.endGesture();
            event.preventDefault();
        }
    }

    /**
     * Handle gesture end
     */
    private handleGestureEnd(): void {
        this.endGesture();
    }

    /**
     * End current gesture
     */
    private endGesture(): void {
        this.isGesturing = false;
        this.gestureStart = null;

        // Reset pointer events for all zones
        this.gestureZones.forEach(element => {
            element.style.pointerEvents = 'none';
        });
    }

    /**
     * Process gesture based on direction
     */
    private processGesture(deltaX: number, deltaY: number): void {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Determine primary direction
        if (absX > absY) {
            // Horizontal gesture
            if (deltaX > 0) {
                this.handleGestureAction('forward');
            } else {
                this.handleGestureAction('back');
            }
        } else {
            // Vertical gesture
            if (deltaY > 0) {
                this.handleGestureAction('scroll-top');
            } else {
                this.handleGestureAction('refresh');
            }
        }
    }

    /**
     * Handle specific gesture actions
     */
    private handleGestureAction(action: string): void {
        this.showGestureFeedback(action);

        switch (action) {
            case 'back':
                this.emit('back');
                break;
            case 'forward':
                this.emit('forward');
                break;
            case 'refresh':
                this.emit('refresh');
                break;
            case 'scroll-top':
                this.emit('scroll-top');
                break;
        }

        this.logger.debug(`Gesture action: ${action}`);
    }

    /**
     * Show visual feedback for gesture
     */
    private showGestureFeedback(action: string): void {
        const messages = {
            'back': '← Back',
            'forward': 'Forward →',
            'refresh': '↻ Refresh',
            'scroll-top': '↑ Top'
        };

        const message = messages[action as keyof typeof messages] || action;

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'gesture-feedback';
        feedback.textContent = message;
        document.body.appendChild(feedback);

        // Remove after animation
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 500);

        this.logger.debug(`Showed gesture feedback: ${message}`);
    }

    /**
     * Enable gestures
     */
    public enableGestures(): void {
        this.gestureZones.forEach(element => {
            element.style.display = 'block';
        });

        this.logger.info('Gestures enabled');
    }

    /**
     * Disable gestures
     */
    public disableGestures(): void {
        this.gestureZones.forEach(element => {
            element.style.display = 'none';
        });

        this.endGesture();
        this.logger.info('Gestures disabled');
    }

    /**
     * Cleanup resources
     */
    public cleanup(): void {
        this.endGesture();
        this.gestureZones.clear();

        this.logger.info('Gesture manager cleanup completed');
    }
}
