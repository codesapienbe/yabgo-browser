import { AssistantService } from '../../src/main/services/AssistantService';
import { DatabaseManager } from '../../src/main/managers/DatabaseManager';

// Mock electron app
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn().mockReturnValue('/tmp')
    }
}));

describe('AssistantService Integration', () => {
    let assistantService: AssistantService;
    let databaseManager: DatabaseManager;

    beforeEach(async () => {
        databaseManager = new DatabaseManager();
        await databaseManager.initialize();
        assistantService = new AssistantService(databaseManager);

        // Add some test data
        databaseManager.insertOrUpdateMetadata({
            url: 'https://rust-lang.org',
            title: 'Rust Programming Language',
            description: 'Rust programming language official site',
            content_snippet: 'Rust is a systems programming language',
            visit_timestamp: new Date().toISOString()
        });
    });

    afterEach(() => {
        databaseManager.close();
    });

    it('should handle search queries correctly', async () => {
        const response = await assistantService.processQuery('find rust');

        expect(response.type).toBe('results');
        expect(response.items).toHaveLength(1);
        expect(response.items![0].title).toBe('Rust Programming Language');
    });

    it('should handle recent pages query', async () => {
        const response = await assistantService.processQuery('recent pages');

        expect(response.type).toBe('results');
        expect(response.title).toBe('📅 Recent Pages');
        expect(response.items).toHaveLength(1);
    });

    it('should clear history on clear command', async () => {
        const response = await assistantService.processQuery('clear history');

        expect(response.type).toBe('info');
        expect(response.message).toContain('cleared successfully');

        // Verify history is actually cleared
        const stats = databaseManager.getStatistics();
        expect(stats.totalPages).toBe(0);
    });
});