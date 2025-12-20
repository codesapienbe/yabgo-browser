import { MCPSettingsManager } from '../../src/renderer/managers/MCPSettingsManager';
import { URLHelper } from '../../src/shared/utils/URLHelper';

// Provide a minimal document shim for this test (avoid relying on heavy jsdom package)
(global as any).document = {
    body: { innerHTML: '' },
    getElementById: (_id: string) => null,
    querySelector: (_sel: string) => null
};
(global as any).window = { localStorage: null } as any;

describe('MCPSettingsManager - GitHub default repo UI', () => {
    let manager: MCPSettingsManager;

    beforeEach(() => {
        // Minimal DOM-like elements required by MCPSettingsManager
        const elements: Record<string, any> = {
            mcpSettingsBtn: { addEventListener: jest.fn() },
            mcpSettingsModal: { classList: { add: jest.fn(), remove: jest.fn() }, querySelector: (_sel: string) => ({ addEventListener: jest.fn() }) },
            githubDefaultRepo: { value: '' },
            githubSaveBtn: { addEventListener: jest.fn() },
            githubClearBtn: { addEventListener: jest.fn() }
        };

        (global as any).document.getElementById = (id: string) => elements[id] || null;

        // ensure clean storage and window.localStorage
        (global as any).localStorage = { _store: {} as Record<string,string>, getItem(k: string){return this._store[k] ?? null;}, setItem(k: string,v:string){this._store[k]=v;}, removeItem(k: string){delete this._store[k];} };
        (global as any).window = { localStorage: (global as any).localStorage, yabgo: { mcp: { onServerConnected: (_cb: any) => () => {}, onError: (_cb: any) => () => {}, getServers: async () => ({ success: true, servers: [] }), discoverTools: async () => ({ success: true, tools: [] }) } } };
        // stub global alert (tests don't have a browser alert)
        (global as any).alert = jest.fn();
        manager = new MCPSettingsManager();
        // call internal setup functions to attach listeners
        (manager as any).setupDOM();
        (manager as any).setupEventListeners();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        document.body.innerHTML = '';
    });

    test('save sets localStorage and updates URLHelper', () => {
        const spy = jest.spyOn(URLHelper, 'configureDefaultRepo');
        const input = document.getElementById('githubDefaultRepo') as HTMLInputElement;
        input.value = 'alice/project';

        // call internal save method directly (avoids simulating DOM clicks)
        (manager as any).saveGithubDefaultRepoFromUI();

        expect((global as any).localStorage.getItem('github.defaultRepo')).toBe('alice/project');
        expect(spy).toHaveBeenCalledWith('alice/project');
    });

    test('clear removes setting and clears URLHelper override', () => {
        const spy = jest.spyOn(URLHelper, 'configureDefaultRepo');
        // prepopulate
        (global as any).localStorage.setItem('github.defaultRepo', 'alice/project');
        const input = document.getElementById('githubDefaultRepo') as HTMLInputElement;
        input.value = 'alice/project';

        // clear by setting empty value and saving via internal method
        input.value = '';
        (manager as any).saveGithubDefaultRepoFromUI();

        expect((global as any).localStorage.getItem('github.defaultRepo')).toBeNull();
        expect(input.value).toBe('');
        expect(spy).toHaveBeenCalledWith(null);
    });
});
