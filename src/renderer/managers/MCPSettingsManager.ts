import { EventEmitter } from '../utils/EventEmitter';
import { mcpBridge } from '../bridge/mcp.bridge';
import type { MCPServerConfig } from '../../types/mcp.types';

/**
 * Manages MCP settings UI and server configuration
 */
export class MCPSettingsManager extends EventEmitter {
    private servers: MCPServerConfig[] = [];
    private settingsModal: HTMLElement | null = null;
    private formModal: HTMLElement | null = null;
    private serverList: HTMLElement | null = null;
    private indicator: HTMLElement | null = null;
    private indicatorText: HTMLElement | null = null;
    private renderDebounceTimer: NodeJS.Timeout | null = null;

    constructor() {
        super();
    }

    async initialize(): Promise<void> {
        this.setupDOM();
        this.setupEventListeners();
        await this.loadServers();
    }

    private setupDOM(): void {
        this.settingsModal = document.getElementById('mcpSettingsModal');
        this.formModal = document.getElementById('mcpServerFormModal');
        this.serverList = document.getElementById('mcpServerList');
        this.indicator = document.getElementById('mcpIndicator');
        this.indicatorText = this.indicator?.querySelector('.mcp-indicator-text') || null;
    }

    private setupEventListeners(): void {
        // Settings button
        document.getElementById('mcpSettingsBtn')?.addEventListener('click', () => {
            this.showSettingsModal();
        });

        // Modal close buttons
        document.getElementById('mcpModalClose')?.addEventListener('click', () => {
            this.hideSettingsModal();
        });

        document.getElementById('mcpFormModalClose')?.addEventListener('click', () => {
            this.hideFormModal();
        });

        // Add server button
        document.getElementById('addMCPServerBtn')?.addEventListener('click', () => {
            this.showAddServerModal();
        });

        // Form actions
        document.getElementById('mcpSaveBtn')?.addEventListener('click', () => {
            this.saveServer();
        });

        document.getElementById('mcpCancelBtn')?.addEventListener('click', () => {
            this.hideFormModal();
        });

        // Close modal on backdrop click
        this.settingsModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            this.hideSettingsModal();
        });

        this.formModal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
            this.hideFormModal();
        });

        // Indicator click to open settings
        this.indicator?.addEventListener('click', () => {
            this.showSettingsModal();
        });

        // Listen for server events from MCP
        mcpBridge.onServerConnected((serverId) => {
            console.log(`[MCP UI] Server connected: ${serverId}`);
            this.updateServerStatus(serverId, 'connected');
        });

        mcpBridge.onError((data) => {
            console.error(`[MCP UI] Error:`, data);
            this.showError(data.error || 'Unknown error occurred');
        });
    }

    private async loadServers(): Promise<void> {
        const response = await mcpBridge.getServers();
        if (response.success && response.servers) {
            this.servers = response.servers;
            this.renderServers();
            this.updateIndicator();
        }
    }

    /**
     * Debounced render to avoid excessive DOM updates
     */
    private renderServers(): void {
        // Clear any pending render
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }

        // Schedule render with debounce
        this.renderDebounceTimer = setTimeout(() => {
            this.renderServersImmediate();
            this.renderDebounceTimer = null;
        }, 100);
    }

    /**
     * Immediate render without debounce
     */
    private renderServersImmediate(): void {
        if (!this.serverList) return;

        if (this.servers.length === 0) {
            this.serverList.innerHTML = '';
            return;
        }

        this.serverList.innerHTML = this.servers.map(server => `
            <div class="mcp-server-item" data-server-id="${server.id}">
                <div class="mcp-server-info">
                    <div class="mcp-server-name">${this.escapeHtml(server.name)}</div>
                    <div class="mcp-server-command">${this.escapeHtml(server.command)} ${server.args.map(a => this.escapeHtml(a)).join(' ')}</div>
                    <div class="mcp-server-status" id="status-${server.id}">
                        ${server.enabled ? 'Enabled' : 'Disabled'}
                    </div>
                </div>
                <div class="mcp-server-actions">
                    <button class="btn-icon" data-action="discover" data-server-id="${server.id}">
                        🔍 Discover
                    </button>
                    <button class="btn-icon danger" data-action="delete" data-server-id="${server.id}">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to action buttons
        this.serverList.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const action = target.dataset.action;
                const serverId = target.dataset.serverId;

                if (action === 'discover' && serverId) {
                    this.discoverTools(serverId);
                } else if (action === 'delete' && serverId) {
                    this.deleteServer(serverId);
                }
            });
        });
    }

    private showSettingsModal(): void {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('hidden');
            this.loadServers(); // Refresh server list
        }
    }

    private hideSettingsModal(): void {
        if (this.settingsModal) {
            this.settingsModal.classList.add('hidden');
        }
    }

    private showAddServerModal(): void {
        if (this.formModal) {
            this.formModal.classList.remove('hidden');
        }
    }

    private hideFormModal(): void {
        if (this.formModal) {
            this.formModal.classList.add('hidden');
            this.clearForm();
        }
    }

    private clearForm(): void {
        (document.getElementById('mcpServerName') as HTMLInputElement).value = '';
        (document.getElementById('mcpServerCommand') as HTMLInputElement).value = '';
        (document.getElementById('mcpServerArgs') as HTMLInputElement).value = '';
        (document.getElementById('permShareHistory') as HTMLInputElement).checked = false;
        (document.getElementById('permShareContent') as HTMLInputElement).checked = false;
        (document.getElementById('permShareSelection') as HTMLInputElement).checked = false;
    }

    private async saveServer(): Promise<void> {
        const name = (document.getElementById('mcpServerName') as HTMLInputElement).value.trim();
        const command = (document.getElementById('mcpServerCommand') as HTMLInputElement).value.trim();
        const argsStr = (document.getElementById('mcpServerArgs') as HTMLInputElement).value.trim();

        if (!name || !command) {
            this.showError('Name and command are required');
            return;
        }

        const config: MCPServerConfig = {
            id: `mcp-${Date.now()}`,
            name,
            command,
            args: argsStr ? argsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
            enabled: true,
            permissions: {
                shareHistory: (document.getElementById('permShareHistory') as HTMLInputElement).checked,
                sharePageContent: (document.getElementById('permShareContent') as HTMLInputElement).checked,
                shareSelections: (document.getElementById('permShareSelection') as HTMLInputElement).checked,
                allowedDomains: [],
            },
            createdAt: Date.now(),
        };

        const response = await mcpBridge.connectServer(config);
        if (response.success) {
            this.servers.push(config);
            this.renderServers();
            this.updateIndicator();
            this.hideFormModal();
            this.showSuccess(`Server "${name}" connected successfully!`);
        } else {
            this.showError(response.error || 'Failed to connect server');
        }
    }

    async discoverTools(serverId: string): Promise<void> {
        const response = await mcpBridge.discoverTools(serverId);
        if (response.success && response.tools) {
            console.log(`[MCP] Tools discovered:`, response.tools);
            this.showToolsDialog(serverId, response.tools);
        } else {
            this.showError(response.error || 'Failed to discover tools');
        }
    }

    async deleteServer(serverId: string): Promise<void> {
        const server = this.servers.find(s => s.id === serverId);
        if (!server) return;

        if (confirm(`Are you sure you want to delete "${server.name}"?`)) {
            const response = await mcpBridge.deleteServer(serverId);
            if (response.success) {
                this.servers = this.servers.filter(s => s.id !== serverId);
                this.renderServers();
                this.updateIndicator();
                this.showSuccess('Server deleted successfully');
            } else {
                this.showError(response.error || 'Failed to delete server');
            }
        }
    }

    private updateServerStatus(serverId: string, status: string): void {
        const statusEl = document.getElementById(`status-${serverId}`);
        if (statusEl) {
            statusEl.textContent = status;
            if (status === 'connected') {
                statusEl.classList.add('connected');
            }
        }
    }

    private showToolsDialog(serverId: string, tools: any[]): void {
        const server = this.servers.find(s => s.id === serverId);
        const serverName = server ? server.name : serverId;

        const toolsList = tools.map(t => `• ${t.name}${t.description ? ': ' + t.description : ''}`).join('\n');
        alert(`Tools available in "${serverName}":\n\n${toolsList || 'No tools found'}`);
    }

    private showError(message: string): void {
        console.error('[MCP Settings]', message);
        // TODO: Implement proper toast notification
        alert(`Error: ${message}`);
    }

    private showSuccess(message: string): void {
        console.log('[MCP Settings]', message);
        // TODO: Implement proper toast notification
        alert(message);
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Update MCP indicator
     */
    private updateIndicator(): void {
        if (!this.indicator || !this.indicatorText) return;

        const enabledServers = this.servers.filter(s => s.enabled);
        const count = enabledServers.length;

        if (count === 0) {
            this.indicator.classList.add('hidden');
        } else {
            this.indicator.classList.remove('hidden');
            this.indicatorText.textContent = `${count} MCP`;

            // Update indicator class based on status
            this.indicator.classList.remove('active', 'error');
        }
    }

    /**
     * Set indicator to active state (when tool is being called)
     */
    public setIndicatorActive(active: boolean): void {
        if (!this.indicator) return;

        if (active) {
            this.indicator.classList.add('active');
        } else {
            this.indicator.classList.remove('active');
        }
    }

    /**
     * Set indicator to error state
     */
    public setIndicatorError(hasError: boolean): void {
        if (!this.indicator) return;

        if (hasError) {
            this.indicator.classList.add('error');
            setTimeout(() => {
                this.indicator?.classList.remove('error');
            }, 3000);
        }
    }
}

