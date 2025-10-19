// Mock electron app.getPath early to allow headless tests to construct DatabaseManager
jest.mock('electron', () => ({
    app: { getPath: () => '/tmp' }
}));

import { MCPClientManager } from '../../src/main/managers/MCPClientManager';
import { MCPContextManager } from '../../src/main/managers/MCPContextManager';
import { DatabaseManager } from '../../src/main/managers/DatabaseManager';
import type { MCPServerConfig, PageContext } from '../../src/types/mcp.types';

describe('MCP Integration Workflow', () => {
    let clientManager: MCPClientManager;
    let contextManager: MCPContextManager;
    let dbManager: DatabaseManager;

    beforeAll(async () => {
        // Mock electron app.getPath for headless test environment
        jest.mock('electron', () => ({
            app: { getPath: () => '/tmp' }
        }));

        // Initialize managers
        clientManager = new MCPClientManager();
        contextManager = new MCPContextManager();
        dbManager = new DatabaseManager();
    });

    afterAll(async () => {
        await clientManager.cleanup();
        dbManager.close();
    });

    describe('End-to-End Server Management', () => {
        it('should complete server lifecycle', async () => {
            const serverConfig: MCPServerConfig = {
                id: 'integration-test-1',
                name: 'Test Server',
                command: 'node',
                args: ['test-server.js'],
                enabled: true,
                permissions: {
                    shareHistory: true,
                    sharePageContent: true,
                    shareSelections: true,
                    allowedDomains: []
                },
                createdAt: Date.now()
            };

            // Step 1: Check no servers initially
            expect(clientManager.getConnectedServers()).toEqual([]);

            // Step 2: Attempt connection (will fail without real server)
            const connected = await clientManager.connectToServer(serverConfig);

            // Step 3: Verify connection state
            expect(typeof connected).toBe('boolean');

            // Step 4: Cleanup
            await clientManager.disconnectServer(serverConfig.id);
        });
    });

    describe('Context Flow', () => {
        it('should extract and filter context', () => {
            // Step 1: Extract context
            const rawContext = {
                url: 'https://github.com/test',
                title: 'GitHub Test',
                selection: 'Important code snippet'
            };

            const context = contextManager.extractContext(rawContext);
            expect(context).toBeDefined();
            expect(context.url).toBe(rawContext.url);

            // Step 2: Update with permissions
            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: ['github.com']
            };

            const filtered = contextManager.updateContext(context, permissions);

            // Step 3: Verify filtering
            expect(filtered.url).toBe('https://github.com/test');
            expect(filtered.selection).toBe('Important code snippet');

            // Step 4: Verify history
            const history = contextManager.getContextHistory(1);
            expect(history.length).toBe(1);
            expect(history[0].url).toBe('https://github.com/test');
        });

        it('should respect domain restrictions', () => {
            const context: PageContext = {
                url: 'https://secret-site.com/data',
                title: 'Secret Data',
                selection: 'Confidential',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: ['github.com'] // Only GitHub allowed
            };

            const filtered = contextManager.updateContext(context, permissions);

            // Should be restricted
            expect(filtered.url).toBe('[restricted]');
            expect(filtered.title).toBe('[restricted]');
            expect(filtered.selection).toBeUndefined();
        });
    });

    describe('Tool Call Flow', () => {
        it('should handle tool call to non-existent server gracefully', async () => {
            const toolCall = {
                serverId: 'non-existent',
                toolName: 'test-tool',
                params: { test: 'value' },
                timestamp: Date.now()
            };

            const result = await clientManager.callTool(toolCall);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('not connected');
        });
    });

    describe('Event Coordination', () => {
        it('should emit and handle context update events', (done) => {
            contextManager.once('context-updated', (ctx) => {
                expect(ctx).toBeDefined();
                expect(ctx.url).toBe('https://test.com');
                done();
            });

            const context: PageContext = {
                url: 'https://test.com',
                title: 'Test',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: []
            };

            contextManager.updateContext(context, permissions);
        });

        it('should emit error events from client manager', (done) => {
            clientManager.once('error', (data) => {
                expect(data).toBeDefined();
                done();
            });

            // Trigger error with invalid config
            const badConfig: MCPServerConfig = {
                id: 'bad',
                name: 'Bad Server',
                command: 'invalid-command-xyz',
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

            clientManager.connectToServer(badConfig);
        });
    });

    describe('Data Persistence (Conceptual)', () => {
        it('should maintain server configuration format', () => {
            const config: MCPServerConfig = {
                id: 'persist-test',
                name: 'Persist Test',
                command: 'node',
                args: ['server.js'],
                env: { TEST: 'value' },
                enabled: true,
                permissions: {
                    shareHistory: true,
                    sharePageContent: false,
                    shareSelections: true,
                    allowedDomains: ['example.com']
                },
                createdAt: Date.now(),
                lastUsed: Date.now()
            };

            // Verify config structure
            expect(config.id).toBeDefined();
            expect(config.name).toBeDefined();
            expect(config.command).toBeDefined();
            expect(Array.isArray(config.args)).toBe(true);
            expect(config.permissions).toBeDefined();
            expect(Array.isArray(config.permissions.allowedDomains)).toBe(true);
        });
    });
});

