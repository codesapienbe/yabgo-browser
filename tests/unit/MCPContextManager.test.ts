import { MCPContextManager } from '../../src/main/managers/MCPContextManager';
import type { PageContext, MCPServerConfig } from '../../src/types/mcp.types';

describe('MCPContextManager', () => {
    let manager: MCPContextManager;

    beforeEach(() => {
        manager = new MCPContextManager();
    });

    describe('Initialization', () => {
        it('should initialize without errors', () => {
            expect(manager).toBeDefined();
            expect(manager).toBeInstanceOf(MCPContextManager);
        });

        it('should start with no current context', () => {
            const context = manager.getCurrentContext();
            expect(context).toBeNull();
        });

        it('should start with empty history', () => {
            const history = manager.getContextHistory();
            expect(history).toEqual([]);
        });
    });

    describe('Context Extraction', () => {
        it('should extract context from raw data', () => {
            const rawData = {
                url: 'https://example.com',
                title: 'Example Page',
                selection: 'Selected text'
            };

            const context = manager.extractContext(rawData);

            expect(context).toBeDefined();
            expect(context.url).toBe('https://example.com');
            expect(context.title).toBe('Example Page');
            expect(context.selection).toBe('Selected text');
            expect(context.timestamp).toBeDefined();
        });

        it('should handle missing selection', () => {
            const rawData = {
                url: 'https://example.com',
                title: 'Example Page'
            };

            const context = manager.extractContext(rawData);

            expect(context.selection).toBeUndefined();
        });

        it('should set timestamp automatically', () => {
            const before = Date.now();
            const context = manager.extractContext({
                url: 'https://example.com',
                title: 'Test'
            });
            const after = Date.now();

            expect(context.timestamp).toBeGreaterThanOrEqual(before);
            expect(context.timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('Context Updates', () => {
        it('should update current context', () => {
            const context: PageContext = {
                url: 'https://example.com',
                title: 'Test Page',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: []
            };

            const filtered = manager.updateContext(context, permissions);

            expect(manager.getCurrentContext()).toEqual(filtered);
        });

        it('should add to history', () => {
            const context: PageContext = {
                url: 'https://example.com',
                title: 'Test',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: []
            };

            manager.updateContext(context, permissions);

            const history = manager.getContextHistory();
            expect(history.length).toBe(1);
        });

        it('should emit context-updated event', (done) => {
            manager.once('context-updated', (ctx) => {
                expect(ctx).toBeDefined();
                expect(ctx.url).toBe('https://example.com');
                done();
            });

            const context: PageContext = {
                url: 'https://example.com',
                title: 'Test',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: []
            };

            manager.updateContext(context, permissions);
        });
    });

    describe('Permission Filtering', () => {
        it('should filter selection based on permissions', () => {
            const context: PageContext = {
                url: 'https://example.com',
                title: 'Test',
                selection: 'Secret text',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: false, // Not allowed
                allowedDomains: []
            };

            const filtered = manager.updateContext(context, permissions);

            expect(filtered.selection).toBeUndefined();
        });

        it('should include selection when permitted', () => {
            const context: PageContext = {
                url: 'https://example.com',
                title: 'Test',
                selection: 'Public text',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true, // Allowed
                allowedDomains: []
            };

            const filtered = manager.updateContext(context, permissions);

            expect(filtered.selection).toBe('Public text');
        });

        it('should restrict URLs not in allowed domains', () => {
            const context: PageContext = {
                url: 'https://secret.com',
                title: 'Secret Page',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: ['example.com'] // Only example.com allowed
            };

            const filtered = manager.updateContext(context, permissions);

            expect(filtered.url).toBe('[restricted]');
            expect(filtered.title).toBe('[restricted]');
        });

        it('should allow URLs in allowed domains', () => {
            const context: PageContext = {
                url: 'https://example.com/page',
                title: 'Public Page',
                timestamp: Date.now()
            };

            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: ['example.com']
            };

            const filtered = manager.updateContext(context, permissions);

            expect(filtered.url).toBe('https://example.com/page');
            expect(filtered.title).toBe('Public Page');
        });
    });

    describe('History Management', () => {
        it('should limit history size', () => {
            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: []
            };

            // Add 60 contexts (max is 50)
            for (let i = 0; i < 60; i++) {
                manager.updateContext({
                    url: `https://example.com/${i}`,
                    title: `Page ${i}`,
                    timestamp: Date.now()
                }, permissions);
            }

            const history = manager.getContextHistory(100);
            expect(history.length).toBe(50);
        });

        it('should return limited history', () => {
            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: []
            };

            // Add 20 contexts
            for (let i = 0; i < 20; i++) {
                manager.updateContext({
                    url: `https://example.com/${i}`,
                    title: `Page ${i}`,
                    timestamp: Date.now()
                }, permissions);
            }

            const history = manager.getContextHistory(5);
            expect(history.length).toBe(5);
        });

        it('should clear history', () => {
            const permissions: MCPServerConfig['permissions'] = {
                shareHistory: true,
                sharePageContent: true,
                shareSelections: true,
                allowedDomains: []
            };

            manager.updateContext({
                url: 'https://example.com',
                title: 'Test',
                timestamp: Date.now()
            }, permissions);

            manager.clearHistory();

            const history = manager.getContextHistory();
            expect(history).toEqual([]);
        });

        it('should emit history-cleared event', (done) => {
            manager.once('history-cleared', () => {
                done();
            });

            manager.clearHistory();
        });
    });
});

