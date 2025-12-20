import { URLHelper } from '../../src/shared/utils/URLHelper';

describe('URLHelper shortcuts (GitHub)', () => {
    test('gh:312 -> pull request on default repo', () => {
        const url = URLHelper.processInput('gh:312');
        expect(url).toBe('https://github.com/codesapienbe/yabgo-browser/pull/312');
    });

    test('gh:owner/repo#id -> explicit PR', () => {
        const url = URLHelper.processInput('gh:octocat/Hello-World#42');
        expect(url).toBe('https://github.com/octocat/Hello-World/pull/42');
    });

    test('ghc:sha -> commit on default repo', () => {
        const url = URLHelper.processInput('ghc:abcdef1');
        expect(url).toBe('https://github.com/codesapienbe/yabgo-browser/commit/abcdef1');
    });

    test('gh:issue:45 -> issue on default repo', () => {
        const url = URLHelper.processInput('gh:issue:45');
        expect(url).toBe('https://github.com/codesapienbe/yabgo-browser/issues/45');
    });

    test('configureDefaultRepo override is used', () => {
        URLHelper.configureDefaultRepo('octocat/Hello-World');
        const url = URLHelper.processInput('gh:123');
        expect(url).toBe('https://github.com/octocat/Hello-World/pull/123');
        // reset
        URLHelper.configureDefaultRepo(null);
    });

    test('localStorage github.defaultRepo is used', () => {
        // Ensure localStorage exists in this test environment
        // ensure global localStorage and window.localStorage are present (Jest may not expose window)
        if (typeof (global as any).localStorage === 'undefined') {
            (global as any).localStorage = {
                _store: {} as Record<string,string>,
                getItem(key: string) { return this._store[key] ?? null; },
                setItem(key: string, value: string) { this._store[key] = value; },
                removeItem(key: string) { delete this._store[key]; }
            };
        }
        // mirror to window.localStorage so URLHelper can read it
        if (typeof (global as any).window === 'undefined') (global as any).window = {};
        (global as any).window.localStorage = (global as any).localStorage;
        (global as any).localStorage.setItem('github.defaultRepo', 'foo/bar');
        const url = URLHelper.processInput('gh:5');
        expect(url).toBe('https://github.com/foo/bar/pull/5');
        (global as any).localStorage.removeItem('github.defaultRepo');
    });
});
