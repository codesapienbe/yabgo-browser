import { URLHelper } from '../../shared/utils/URLHelper';
import type { MCPServerConfig } from '../../types/mcp.types';
import { mcpBridge } from '../bridge/mcp.bridge';
import { EventEmitter } from '../utils/EventEmitter';

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
    private statusInterval: number | null = null;
    private interpInterval: number | null = null;
    private lastStatus: Map<string, { nextAt: number | null; initialDelay: number | null; attempts: number; pid: number | null; lastStderr?: string | null }> = new Map();

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

        // GitHub shortcuts save/clear handlers
        document.getElementById('githubSaveBtn')?.addEventListener('click', () => {
            this.saveGithubDefaultRepoFromUI();
        });

        document.getElementById('githubClearBtn')?.addEventListener('click', () => {
            const input = document.getElementById('githubDefaultRepo') as HTMLInputElement | null;
            if (input) input.value = '';
            // remove setting
            try { window.localStorage.removeItem('github.defaultRepo'); } catch {}
            URLHelper.configureDefaultRepo(null);
            this.showSuccess('GitHub default repo cleared');
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
                    <div class="mcp-server-supervise">
                        <label class="switch"> 
                            <input type="checkbox" data-action="toggle-enabled" data-server-id="${server.id}" ${server.enabled ? 'checked' : ''} />
                            <span class="slider"></span>
                        </label>
                        <button class="btn-icon" data-action="edit-json" data-server-id="${server.id}">JSON</button>
                        <div class="mcp-server-supervise-status" id="supervise-status-${server.id}">PID: - | Attempts: 0</div>
                        <div class="mcp-server-last-stderr" id="stderr-${server.id}"></div>
                    </div>
                </div>
                <div class="mcp-server-actions">
                    <button class="btn-icon" data-action="discover" data-server-id="${server.id}">🔍 Discover</button>
                    <button class="btn-icon" data-action="restart" data-server-id="${server.id}">🔁 Restart</button>
                    <button class="btn-icon danger" data-action="delete" data-server-id="${server.id}">🗑️ Delete</button>
                </div>
            </div>
        `).join('');

        // Add event listeners to action buttons and toggles
        this.serverList.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const action = target.dataset.action;
                const serverId = target.dataset.serverId;

                if (action === 'discover' && serverId) {
                    this.discoverTools(serverId);
                } else if (action === 'delete' && serverId) {
                    this.deleteServer(serverId);
                } else if (action === 'restart' && serverId) {
                    this.restartServer(serverId);
                }
            });
        });

        // Enabled toggle and JSON edit button handlers
        this.serverList.querySelectorAll('input[data-action="toggle-enabled"]').forEach(cb => {
            cb.addEventListener('change', async (e) => {
                const input = e.currentTarget as HTMLInputElement;
                const serverId = input.dataset.serverId;
                if (!serverId) return;

                const server = this.servers.find(s => s.id === serverId);
                if (!server) return;

                // Toggle enabled state and persist
                const prev = server.enabled;
                server.enabled = input.checked;
                const response = await mcpBridge.setServerEnabled(server, server.enabled);
                if (!response || !response.success) {
                    this.showError('Failed to update enabled setting');
                    input.checked = prev; // revert
                    server.enabled = prev;
                    return;
                }

                this.updateServerStatus(serverId, server.enabled ? 'Enabled' : 'Disabled');
            });
        });

        this.serverList.querySelectorAll('button[data-action="edit-json"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const serverId = target.dataset.serverId;
                if (!serverId) return;
                this.showJsonEditor(serverId);
            });
        });

        // Initial status fetch for supervised servers (UI reads status but no auto-retries)
        this.servers.forEach(s => {
            if (s.supervise) this.updateSuperviseStatus(s.id);
        });
    }

    private showSettingsModal(): void {
        if (this.settingsModal) {
            this.settingsModal.classList.remove('hidden');
            this.loadServers(); // Refresh server list
            // Load GitHub shortcut setting into UI
            this.loadGithubDefaultRepoToUI();
            // Start periodic status updater (every 5s)
            if (!this.statusInterval) {
                this.statusInterval = window.setInterval(() => {
                    this.servers.forEach(s => {
                        if (s.supervise) this.updateSuperviseStatus(s.id);
                    });
                }, 5000);
            }

            // Start interpolation interval for smooth progress (1s)
            if (!this.interpInterval) {
                this.interpInterval = window.setInterval(() => {
                    // update progress bars based on lastStatus
                    this.lastStatus.forEach((st, id) => {
                        const progressContainer = document.getElementById(`progress-${id}`) as HTMLElement | null;
                        const progressBar = document.getElementById(`progress-bar-${id}`) as HTMLElement | null;
                        if (!progressContainer || !progressBar) return;
                        if (st.nextAt && st.initialDelay && st.initialDelay > 0) {
                            const remaining = Math.max(0, st.nextAt - Date.now());
                            const percent = Math.max(0, Math.min(100, Math.round((1 - (remaining / st.initialDelay)) * 100)));
                            progressContainer.style.display = 'block';
                            progressBar.style.width = `${percent}%`;
                        } else {
                            progressContainer.style.display = 'none';
                            progressBar.style.width = `0%`;
                        }
                    });
                }, 1000);
            }
        }
    }

    private hideSettingsModal(): void {
        if (this.settingsModal) {
            this.settingsModal.classList.add('hidden');
            if (this.statusInterval) {
                clearInterval(this.statusInterval);
                this.statusInterval = null;
            }
            if (this.interpInterval) {
                clearInterval(this.interpInterval);
                this.interpInterval = null;
            }
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
        const cwdEl = document.getElementById('mcpServerCwd') as HTMLInputElement | null;
        if (cwdEl) cwdEl.value = '';
        const superviseEl = document.getElementById('mcpSupervise') as HTMLInputElement | null;
        if (superviseEl) superviseEl.checked = false;
        (document.getElementById('permShareHistory') as HTMLInputElement).checked = false;
        (document.getElementById('permShareContent') as HTMLInputElement).checked = false;
        (document.getElementById('permShareSelection') as HTMLInputElement).checked = false;
    }

    private showJsonEditor(serverId: string): void {
        const modal = document.getElementById('mcpServerJsonModal');
        const textarea = document.getElementById('mcpServerJson') as HTMLTextAreaElement | null;
        if (!modal || !textarea) return;

        const server = this.servers.find(s => s.id === serverId);
        if (!server) return;

        textarea.value = JSON.stringify(server, null, 2);
        modal.classList.remove('hidden');

        // Setup save/cancel handlers
        const saveBtn = document.getElementById('mcpJsonSaveBtn');
        const cancelBtn = document.getElementById('mcpJsonCancelBtn');
        const closeBtn = document.getElementById('mcpJsonModalClose');

        const onSave = async () => {
            try {
                const updated = JSON.parse(textarea.value);
                // Ensure required fields
                if (!updated.id || !updated.name || !updated.command) {
                    this.showError('JSON must include id, name and command');
                    return;
                }

                // Persist via connectServer (which saves on success) or setServerEnabled
                const resp = await mcpBridge.connectServer(updated);
                if (resp.success) {
                    // replace local server copy and re-render
                    this.servers = this.servers.map(s => s.id === updated.id ? updated : s);
                    this.renderServers();
                    this.updateIndicator();
                    this.showSuccess('Server JSON updated');
                    modal.classList.add('hidden');
                } else {
                    this.showError(resp.error || 'Failed to apply server JSON');
                }
            } catch (err) {
                this.showError('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
            }
        };

        const onCancel = () => {
            modal.classList.add('hidden');
        };

        saveBtn?.removeEventListener('click', onSave as any);
        cancelBtn?.removeEventListener('click', onCancel as any);
        closeBtn?.removeEventListener('click', onCancel as any);

        saveBtn?.addEventListener('click', onSave as any);
        cancelBtn?.addEventListener('click', onCancel as any);
        closeBtn?.addEventListener('click', onCancel as any);
    }

    private async saveServer(): Promise<void> {
        const name = (document.getElementById('mcpServerName') as HTMLInputElement).value.trim();
        const command = (document.getElementById('mcpServerCommand') as HTMLInputElement).value.trim();
        const argsStr = (document.getElementById('mcpServerArgs') as HTMLInputElement).value.trim();
        const cwd = (document.getElementById('mcpServerCwd') as HTMLInputElement).value.trim();
        const supervise = (document.getElementById('mcpSupervise') as HTMLInputElement).checked;

        if (!name || !command) {
            this.showError('Name and command are required');
            return;
        }

        const config: MCPServerConfig = {
            id: `mcp-${Date.now()}`,
            name,
            command,
            args: argsStr ? argsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
            cwd: cwd || undefined,
            supervise,
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

    async restartServer(serverId: string): Promise<void> {
        const server = this.servers.find(s => s.id === serverId);
        if (!server) return;

        // Show simple confirmation
        if (!confirm(`Restart server "${server.name}"? This will stop and then attempt to start it.`)) return;

        try {
            // Disconnect then reconnect
            await mcpBridge.disconnectServer(serverId);
            // small delay to ensure process cleanup
            await new Promise(r => setTimeout(r, 300));
            const resp = await mcpBridge.connectServer(server);
            if (resp.success) {
                this.showSuccess(`Server "${server.name}" restarted`);
                // refresh list/status
                await this.loadServers();
            } else {
                this.showError(resp.error || 'Failed to restart server');
            }
        } catch (err) {
            this.showError('Restart failed: ' + (err instanceof Error ? err.message : String(err)));
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
        // Also refresh supervise status if relevant
        this.updateSuperviseStatus(serverId);
    }

    private async updateSuperviseStatus(serverId: string): Promise<void> {
        try {
            const resp = await mcpBridge.getServerStatus(serverId);
            if (!resp || !resp.success) return;
            const status = resp.status;
            const st = status || { pid: null as number | null, attempts: 0, lastStderr: null as string | null, nextAt: null as number | null };
            const el = document.getElementById(`supervise-status-${serverId}`);
            if (el) {
                const nextAt = st.nextAt ? Math.max(0, Math.ceil((st.nextAt - Date.now()) / 1000)) : null;
                const nextText = nextAt !== null ? ` | Next in: ${nextAt}s` : '';
                el.textContent = `PID: ${st.pid ?? '-'} | Attempts: ${st.attempts ?? 0}${nextText}`;
            }
            const stderrEl = document.getElementById(`stderr-${serverId}`);
            if (stderrEl) {
                stderrEl.textContent = st.lastStderr ? `Last stderr: ${st.lastStderr}` : '';
            }

            // Store last status for interpolation on client side and update progress immediately
            const initialDelay = st.nextAt ? Math.max(1, st.nextAt - Date.now()) : null;
            this.lastStatus.set(serverId, { nextAt: st.nextAt ?? null, initialDelay, attempts: st.attempts ?? 0, pid: st.pid ?? null, lastStderr: st.lastStderr ?? null });

            const progressContainer = document.getElementById(`progress-${serverId}`) as HTMLElement | null;
            const progressBar = document.getElementById(`progress-bar-${serverId}`) as HTMLElement | null;
            if (progressContainer && progressBar) {
                if (st.nextAt && initialDelay && st.nextAt > Date.now()) {
                    const remaining = Math.max(0, st.nextAt - Date.now());
                    const percent = Math.max(0, Math.min(100, Math.round((1 - (remaining / initialDelay)) * 100)));
                    progressContainer.style.display = 'block';
                    progressBar.style.width = `${percent}%`;
                } else {
                    progressContainer.style.display = 'none';
                    progressBar.style.width = `0%`;
                }
            }
        } catch (err) {
            // ignore
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

    private loadGithubDefaultRepoToUI(): void {
        try {
            const val = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem('github.defaultRepo') : null;
            const input = document.getElementById('githubDefaultRepo') as HTMLInputElement | null;
            if (input) input.value = val || '';
        } catch (err) {
            // ignore failures
        }
    }

    private saveGithubDefaultRepoFromUI(): void {
        const input = document.getElementById('githubDefaultRepo') as HTMLInputElement | null;
        if (!input) return;
        const val = input.value.trim();
        try {
            if (val) {
                window.localStorage.setItem('github.defaultRepo', val);
                URLHelper.configureDefaultRepo(val);
                this.showSuccess('GitHub default repo saved');
            } else {
                window.localStorage.removeItem('github.defaultRepo');
                URLHelper.configureDefaultRepo(null);
                this.showSuccess('GitHub default repo cleared');
            }
        } catch (err) {
            this.showError('Failed to save setting');
        }
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

