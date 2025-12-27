import fs from 'fs';
import os from 'os';
import path from 'path';
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
    const originalEnv = {...process.env};

    beforeEach(() => {
        global.fetch = jest.fn();
        process.env = {...originalEnv};
    });

    afterEach(() => {
        global.fetch = originalFetch;
        process.env = {...originalEnv};
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

    it('uses mock repo data when configured', async () => {
        const now = Date.now();
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'github-mock-'));
        const mockPath = path.join(tempDir, 'repos.json');
        const repos = [
            buildRepo({
                id: 1,
                name: 'recent',
                pushed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            buildRepo({
                id: 2,
                name: 'private',
                private: true,
                pushed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            buildRepo({
                id: 3,
                name: 'forked',
                fork: true,
                pushed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            buildRepo({
                id: 4,
                name: 'archived',
                archived: true,
                pushed_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
            }),
            buildRepo({
                id: 5,
                name: 'stale',
                pushed_at: new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString(),
            }),
        ];
        fs.writeFileSync(mockPath, JSON.stringify(repos), 'utf-8');
        process.env.MOCK_GITHUB_DATA_PATH = mockPath;

        const result = await getActiveRepos({
            username: 'owner',
            lookbackDays: 30,
        });

        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.repos.map((repo) => repo.name)).toEqual(['recent']);
        fs.rmSync(tempDir, {recursive: true, force: true});
    });

    it('reports rate limit reset when GitHub returns 403', async () => {
        const onRateLimit = jest.fn();
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            headers: {
                get: (name: string) => {
                    if (name === 'x-ratelimit-remaining') return '0';
                    if (name === 'x-ratelimit-reset') return '123';
                    return null;
                },
            },
            json: async () => [],
        });

        const result = await getActiveRepos({
            username: 'owner',
            lookbackDays: 30,
            onRateLimit,
        });

        expect(onRateLimit).toHaveBeenCalledWith(123000);
        expect(result.error).toContain('403');
        expect(result.repos).toEqual([]);
    });

    it('adds authorization header when token is set', async () => {
        process.env.GITHUB_TOKEN = 'token';
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => [],
        });

        await getActiveRepos({
            username: 'owner',
            lookbackDays: 30,
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('https://api.github.com/users/owner/repos'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer token',
                }),
            }),
        );
    });

    it('returns an error when fetch throws', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('boom'));

        const result = await getActiveRepos({
            username: 'owner',
            lookbackDays: 30,
        });

        expect(result.repos).toEqual([]);
        expect(result.error).toContain('boom');
    });
});
