/**
 * Simple event emitter implementation for a renderer process
 */

type Callback = (...args: any[]) => void;

export class EventEmitter {
    private events: Map<string, Callback[]> = new Map();

    /**
     * Add event listener
     */
    public on(event: string, callback: Callback): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);
    }

    /**
     * Add one-time event listener
     */
    public once(event: string, callback: Callback): void {
        const onceCallback: Callback = (...args: any[]) => {
            callback(...args);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }

    /**
     * Remove event listener
     */
    public off(event: string, callback: Callback): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    public emit(event: string, ...args: any[]): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(...args));
        }
    }

    /**
     * Remove all listeners
     */
    public removeAllListeners(event?: string): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}
