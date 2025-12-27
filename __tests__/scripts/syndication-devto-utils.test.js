const {
    sanitizeTitle,
    normalizeTitleKey,
    normalizeDevtoTag,
    buildDevtoTags,
    buildDevtoCollisionIndex,
    findDevtoCollision,
    interpretDevtoResponse,
} = require('../../scripts/syndication/devtoUtils.cjs');

describe('Syndication Dev.to helpers', () => {
    describe('title and tag normalization', () => {
        it('sanitizes titles by collapsing whitespace and stripping control chars', () => {
            expect(sanitizeTitle(' Hello\tWorld\u0000')).toBe('Hello World');
            expect(sanitizeTitle(null)).toBe('');
        });

        it('normalizes title keys to lowercase alphanumerics', () => {
            expect(normalizeTitleKey('Hello, World!')).toBe('helloworld');
        });

        it('normalizes Dev.to tags to lowercase alphanumerics', () => {
            expect(normalizeDevtoTag('EF-Core')).toBe('efcore');
            expect(normalizeDevtoTag('C#')).toBe('csharp');
        });

        it('dedupes and limits Dev.to tags', () => {
            const tags = ['EF-Core', 'ef core', 'C#', 'C#', 'extra', 'five'];
            expect(buildDevtoTags(tags, 4)).toEqual(['efcore', 'csharp', 'extra', 'five']);
        });
    });

    describe('collision detection', () => {
        const articles = [
            {
                id: 1,
                canonical_url: 'https://example.com/blog/posts/first',
                title: 'First Post',
                url: 'https://dev.to/me/first',
            },
            {
                id: 2,
                canonical_url: 'https://example.com/blog/posts/second',
                title: 'Second Post',
                url: 'https://dev.to/me/second',
            },
        ];

        it('detects collisions by canonical url', () => {
            const index = buildDevtoCollisionIndex(articles);
            const prepared = {
                title: 'Different title',
                canonicalUrl: 'https://example.com/blog/posts/second',
            };
            expect(findDevtoCollision(prepared, index)).toEqual(articles[1]);
        });

        it('detects collisions by normalized title when canonical url differs', () => {
            const index = buildDevtoCollisionIndex(articles);
            const prepared = {
                title: 'First post!!!',
                canonicalUrl: 'https://example.com/blog/posts/third',
            };
            expect(findDevtoCollision(prepared, index)).toEqual(articles[0]);
        });

        it('returns null when no collision is found', () => {
            const index = buildDevtoCollisionIndex(articles);
            const prepared = {
                title: 'Another post',
                canonicalUrl: 'https://example.com/blog/posts/fourth',
            };
            expect(findDevtoCollision(prepared, index)).toBeNull();
        });
    });

    describe('Dev.to response handling', () => {
        const prepared = {
            canonicalUrl: 'https://example.com/blog/posts/test-post',
            publishedAt: '2024-01-01T00:00:00Z',
        };

        it('marks rate limited responses as skipped', async () => {
            const response = {
                status: 429,
                ok: false,
                text: async () => '',
            };
            const result = await interpretDevtoResponse(response, prepared);
            expect(result).toMatchObject({ skipped: true, rateLimited: true });
        });

        it('marks canonical conflicts as already published', async () => {
            const response = {
                status: 422,
                ok: false,
                text: async () => 'Canonical url has already been taken',
            };
            const result = await interpretDevtoResponse(response, prepared);
            expect(result).toMatchObject({
                skipped: true,
                markAsPublished: true,
                url: prepared.canonicalUrl,
            });
        });
    });
});
