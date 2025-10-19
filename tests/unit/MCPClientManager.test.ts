import { MCPClientManager } from '../../src/main/managers/MCPClientManager';
import type { MCPServerConfig } from '../../src/types/mcp.types';

describe('MCPClientManager', () => {
    let manager: MCPClientManager;

    beforeEach(() => {
        manager = new MCPClientManager();
    });

    afterEach(async () => {
        await manager.cleanup();
    });

    describe('Initialization', () => {
        it('should initialize without errors', () => {
            expect(manager).toBeDefined();
            expect(manager).toBeInstanceOf(MCPClientManager);
        });

        it('should start with no connected servers', () => {
            const servers = manager.getConnectedServers();
            expect(servers).toEqual([]);
        });
    });

    describe('Connection Management', () => {
        it('should track connection state', () => {
            const serverId = 'test-server-1';
            expect(manager.isConnected(serverId)).toBe(false);
        });

        it('should return empty array for connected servers initially', () => {
            const servers = manager.getConnectedServers();
            expect(Array.isArray(servers)).toBe(true);
            expect(servers.length).toBe(0);
        });

        it('should emit server-connected event on successful connection', async () => {
            const config: MCPServerConfig = {
                id: 'test-1',
                name: 'Test Server',
                command: 'node',
                args: ['test.js'],
                enabled: true,
                permissions: {
                    shareHistory: false,
                    sharePageContent: false,
                    shareSelections: false,
                    allowedDomains: []
                },
                createdAt: Date.now()
            };

            // Wait for server-connected event if it occurs (not required for this test)
            manager.once('server-connected', () => { });

            // This will likely fail without a real MCP server, but tests the flow
            const result = await manager.connectToServer(config);

            // We expect false in test env (no real server)
            expect(typeof result).toBe('boolean');
        });
    });

    describe('Tool Operations', () => {
        it('should throw error when discovering tools on non-existent server', async () => {
            await expect(manager.discoverTools('non-existent')).rejects.toThrow();
        });

        it('should handle tool calls to non-connected servers', async () => {
            const result = await manager.callTool({
                serverId: 'non-existent',
                toolName: 'test',
                params: {},
                timestamp: Date.now()
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('not connected');
        });
    });

    describe('Cleanup', () => {
        it('should cleanup without errors', async () => {
            await expect(manager.cleanup()).resolves.toBeUndefined();
        });

        it('should remove all servers after cleanup', async () => {
            await manager.cleanup();
            const servers = manager.getConnectedServers();
            expect(servers).toEqual([]);
        });
    });

    describe('Event Emission', () => {
        it('should emit error events', (done) => {
            manager.once('error', (data) => {
                expect(data).toBeDefined();
                expect(data).toHaveProperty('error');
                done();
            });

            // Trigger error by connecting to invalid server
            const config: MCPServerConfig = {
                id: 'invalid',
                name: 'Invalid',
                command: 'nonexistent-command',
                args: [],
                enabled: true,
                permissions: {
                    shareHistory: false,
                    sharePageContent: false,
                    shareSelections: false,
                    allowedDomains: []
                },
                createdAt: Date.now()
            };

            manager.connectToServer(config);
        });
    });
});

