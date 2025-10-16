import { BrowserWindowConstructorOptions } from 'electron';

/**
 * Window configuration interface
 */
export interface WindowConfig extends BrowserWindowConstructorOptions {
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
}

/**
 * Window state interface
 */
export interface WindowState {
    x?: number;
    y?: number;
    width: number;
    height: number;
    isMaximized: boolean;
    isMinimized: boolean;
    isFullScreen: boolean;
}

/**
 * Window events
 */
export type WindowEventType = 
    | 'minimize'
    | 'maximize'
    | 'restore'
    | 'close'
    | 'focus'
    | 'blur'
    | 'show'
    | 'hide';
