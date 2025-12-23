import {getActiveRepos, type GitHubRepo} from '../../lib/github';

const buildRepo = (overrides: Partial<GitHubRepo>) => ({
    id: Math.random(),
    name: 'repo',
    full_name: 'owner/repo',
    description: null,
    html_url: 'https://github.com/owner/repo',
    homepage: null,
    language: 'TypeScript',
    topics: [],
    stargazers_count: 0,
    forks_count: 0,
    archived: false,
    fork: false,
    pushed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

describe('getActiveRepos', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.resetAllMocks();
    });

    it('filters by lookback date and archive status', async () => {
        const now = Date.now();
        const repos = [
            buildRepo({
                id: 1,
                name: 'recent',
                pushed_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            buildRepo({
                id: 2,
                name: 'stale',
                pushed_at: new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            buildRepo({
                id: 3,
                name: 'archived',
                archived: true,
                pushed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
        ];

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => repos,
        });

        const result = await getActiveRepos({
            username: 'owner',
            lookbackDays: 30,
        });

        expect(result.error).toBeNull();
        expect(result.repos.map((repo) => repo.name)).toEqual(['recent']);
    });

    it('includes forks and archived when requested', async () => {
        const now = Date.now();
        const repos = [
            buildRepo({
                id: 1,
                name: 'forked',
                fork: true,
                pushed_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            buildRepo({
                id: 2,
                name: 'archived',
                archived: true,
                pushed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
        ];

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => repos,
        });

        const result = await getActiveRepos({
            username: 'owner',
            lookbackDays: 30,
            includeForks: true,
            includeArchived: true,
        });

        expect(result.repos).toHaveLength(2);
        expect(result.repos[0].pushed_at >= result.repos[1].pushed_at).toBe(true);
    });
});
