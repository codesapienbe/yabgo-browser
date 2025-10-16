/**
 * Simple logging utility for YABGO Browser
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private context: string;
    private level: LogLevel;

    constructor(context: string, level: LogLevel = LogLevel.INFO) {
        this.context = context;
        this.level = level;
    }

    /**
     * Log debug message
     */
    public debug(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(`[${this.getTimestamp()}] [DEBUG] [${this.context}] ${message}`, ...args);
        }
    }

    /**
     * Log info message
     */
    public info(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.INFO) {
            console.info(`[${this.getTimestamp()}] [INFO] [${this.context}] ${message}`, ...args);
        }
    }

    /**
     * Log warning message
     */
    public warn(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.WARN) {
            console.warn(`[${this.getTimestamp()}] [WARN] [${this.context}] ${message}`, ...args);
        }
    }

    /**
     * Log error message
     */
    public error(message: string, ...args: any[]): void {
        if (this.level <= LogLevel.ERROR) {
            console.error(`[${this.getTimestamp()}] [ERROR] [${this.context}] ${message}`, ...args);
        }
    }

    /**
     * Get formatted timestamp
     */
    private getTimestamp(): string {
        return new Date().toISOString();
    }

    /**
     * Set log level
     */
    public setLevel(level: LogLevel): void {
        this.level = level;
    }
}
