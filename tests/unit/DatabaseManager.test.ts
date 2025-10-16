import { DatabaseManager } from '../../src/main/managers/DatabaseManager';
import { PageMetadata } from '../../src/shared/types/DataTypes';

// Mock electron app
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn().mockReturnValue('/tmp')
    }
}));

describe('DatabaseManager', () => {
    let databaseManager: DatabaseManager;

    beforeEach(async () => {
        databaseManager = new DatabaseManager();
        await databaseManager.initialize();
    });

    afterEach(() => {
        databaseManager.close();
    });

    it('should insert and retrieve page metadata', () => {
        const metadata: PageMetadata = {
            url: 'https://example.com',
            title: 'Test Page',
            description: 'A test page',
            keywords: 'test, page',
            content_snippet: 'This is a test page content',
            visit_timestamp: new Date().toISOString()
        };

        // Insert metadata
        databaseManager.insertOrUpdateMetadata(metadata);

        // Search for it
        const results = databaseManager.searchPages('test');
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Test Page');
    });

    it('should increment visit count on duplicate URLs', () => {
        const metadata: PageMetadata = {
            url: 'https://example.com',
            title: 'Test Page',
            description: 'A test page',
            keywords: 'test, page',
            content_snippet: 'This is a test page content',
            visit_timestamp: new Date().toISOString()
        };

        // Insert twice
        databaseManager.insertOrUpdateMetadata(metadata);
        databaseManager.insertOrUpdateMetadata(metadata);

        // Should have visit count of 2
        const results = databaseManager.searchPages('test');
        expect(results[0].visit_count).toBe(2);
    });

    it('should return recent pages in correct order', () => {
        const now = new Date();
        const metadata1: PageMetadata = {
            url: 'https://example1.com',
            title: 'First Page',
            content_snippet: 'First page content',
            visit_timestamp: new Date(now.getTime() - 1000).toISOString()
        };

        const metadata2: PageMetadata = {
            url: 'https://example2.com', 
            title: 'Second Page',
            content_snippet: 'Second page content',
            visit_timestamp: now.toISOString()
        };

        databaseManager.insertOrUpdateMetadata(metadata1);
        databaseManager.insertOrUpdateMetadata(metadata2);

        const recent = databaseManager.getRecentPages(2);
        expect(recent[0].title).toBe('Second Page');
        expect(recent[1].title).toBe('First Page');
    });
});