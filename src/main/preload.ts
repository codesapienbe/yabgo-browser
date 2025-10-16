import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { PageMetadata, AssistantResponse } from '../shared/types/DataTypes';

/**
 * Preload script - Exposes secure API to renderer process
 */

// Define the API interface
export interface YabgoAPI {
    // Database operations
    savePageMetadata: (metadata: PageMetadata) => Promise<{ success: boolean; error?: string }>;
    getHistory: (limit?: number) => Promise<PageMetadata[]>;
    getStatistics: () => Promise<{ totalPages: number; totalVisits: number }>;

    // Assistant operations
    assistantQuery: (query: string) => Promise<AssistantResponse>;

    // Window operations
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;

    // Event listeners
    onWindowEvent: (callback: (event: string, data?: any) => void) => void;
    removeAllListeners: () => void;
}

// Expose the API to the renderer process
const yabgoAPI: YabgoAPI = {
    // Database operations
    savePageMetadata: (metadata: PageMetadata) => 
        ipcRenderer.invoke('db:save-metadata', metadata),

    getHistory: (limit?: number) => 
        ipcRenderer.invoke('db:get-history', limit),

    getStatistics: () => 
        ipcRenderer.invoke('db:get-statistics'),

    // Assistant operations
    assistantQuery: (query: string) => 
        ipcRenderer.invoke('assistant:query', query),

    // Window operations
    minimizeWindow: () => 
        ipcRenderer.invoke('window:minimize'),

    maximizeWindow: () => 
        ipcRenderer.invoke('window:maximize'),

    closeWindow: () => 
        ipcRenderer.invoke('window:close'),

    // Event listeners
    onWindowEvent: (callback: (event: string, data?: any) => void) => {
        const handleEvent = (event: IpcRendererEvent, eventName: string, data?: any) => {
            callback(eventName, data);
        };
        ipcRenderer.on('window-event', handleEvent);
    },

    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('window-event');
    }
};

// Expose the API
contextBridge.exposeInMainWorld('yabgo', yabgoAPI);

// Type declaration for window object
declare global {
    interface Window {
        yabgo: YabgoAPI;
    }
}
