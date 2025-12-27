import type {Page} from '@playwright/test';

export const mockPipelineStatus = async (page: Page) => {
    await page.route('**/api/pipeline-status**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                summary: {running: 1, passing: 2, failing: 1, unknown: 0, total: 4},
                repos: [
                    {
                        id: 1001,
                        name: 'personal-site',
                        fullName: 'jerrettdavis/personal-site',
                        htmlUrl: 'https://github.com/jerrettdavis/personal-site',
                        status: 'passing',
                        runName: 'build-and-test',
                        runUrl: 'https://github.com/jerrettdavis/personal-site/actions/runs/1',
                        runStatus: 'completed',
                        runConclusion: 'success',
                        updatedAt: '2025-02-01T12:10:00Z',
                    },
                    {
                        id: 1002,
                        name: 'tinybdd',
                        fullName: 'jerrettdavis/tinybdd',
                        htmlUrl: 'https://github.com/jerrettdavis/tinybdd',
                        status: 'running',
                        runName: 'ci',
                        runUrl: 'https://github.com/jerrettdavis/tinybdd/actions/runs/2',
                        runStatus: 'in_progress',
                        runConclusion: null,
                        updatedAt: '2025-02-01T12:12:00Z',
                    },
                    {
                        id: 1003,
                        name: 'JD.Efcpt.Build',
                        fullName: 'jerrettdavis/JD.Efcpt.Build',
                        htmlUrl: 'https://github.com/jerrettdavis/JD.Efcpt.Build',
                        status: 'failing',
                        runName: 'release',
                        runUrl: 'https://github.com/jerrettdavis/JD.Efcpt.Build/actions/runs/3',
                        runStatus: 'completed',
                        runConclusion: 'failure',
                        updatedAt: '2025-02-01T11:58:00Z',
                    },
                ],
                fetchedAt: '2025-02-01T12:15:00Z',
            }),
        });
    });
};

export const mockSiteBuildStatus = async (page: Page) => {
    await page.route('**/api/site-build-status**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                summary: {building: 1, queued: 0, failed: 0, inProgress: 1},
                production: {
                    id: 'prod-1',
                    url: 'https://jerrett.dev',
                    readyState: 'READY',
                    status: 'ready',
                    createdAt: '2025-02-01T10:00:00Z',
                    branch: 'main',
                    commitMessage: 'Ship new experience',
                    commitSha: 'abc123',
                    author: 'Jerrett Davis',
                    prId: null,
                    prUrl: null,
                },
                previews: [
                    {
                        id: 'preview-1',
                        url: 'https://preview-1.vercel.app',
                        readyState: 'BUILDING',
                        status: 'building',
                        createdAt: '2025-02-01T12:05:00Z',
                        branch: 'feature/telemetry',
                        commitMessage: 'Add telemetry detail cards',
                        commitSha: 'def456',
                        author: 'Jerrett Davis',
                        prId: 12,
                        prUrl: 'https://github.com/jerrettdavis/personal-site/pull/12',
                    },
                ],
                fetchedAt: '2025-02-01T12:15:00Z',
            }),
        });
    });
};

export const mockProjectDetails = async (page: Page) => {
    await page.route('**/api/project-details**', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                repoFullName: 'jerrettdavis/personal-site',
                readme: {
                    contentHtml: '<p>Intro <strong>bold</strong> readme summary.</p><ul><li>Telemetry</li><li>Layouts</li></ul>',
                    truncated: true,
                    url: 'https://github.com/jerrettdavis/personal-site#readme',
                },
                openIssues: 4,
                openPulls: 2,
                latestRelease: {
                    tag: 'v1.2.3',
                    url: 'https://github.com/jerrettdavis/personal-site/releases/tag/v1.2.3',
                    publishedAt: '2025-01-15T09:00:00Z',
                },
                fetchedAt: '2025-02-01T12:15:00Z',
            }),
        });
    });
};

export const mockSearchIndex = async (page: Page) => {
    const payload = {
        pages: [
            {
                label: 'Projects',
                description: 'Active builds and repo summaries.',
                href: '/projects',
                keywords: ['repos', 'pipelines'],
            },
            {
                label: 'Docs',
                description: 'Architecture and deployment notes.',
                href: '/docs',
                keywords: ['documentation'],
            },
        ],
        posts: [
            {
                id: 'programming-is',
                title: 'Programming is...',
                summary: 'Reflections on building software.',
                tags: ['reflection'],
                categories: ['writing'],
            },
        ],
    };

    await page.route('**/api/search-index', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(payload),
        });
    });

    await page.route('**/_next/data/**/search.json', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({pageProps: payload}),
        });
    });
};
