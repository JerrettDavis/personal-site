import {buildSearchIndex} from '../../lib/search';
import {NAV_ITEMS} from '../../data/nav';
import {getSortedPostsData} from '../../lib/posts';

jest.mock('../../lib/posts', () => ({
    getSortedPostsData: jest.fn(),
}));

describe('buildSearchIndex', () => {
    it('maps navigation and posts into a search index', async () => {
        const mockedPosts = getSortedPostsData as jest.MockedFunction<typeof getSortedPostsData>;
        mockedPosts.mockResolvedValue([
            {
                id: 'first-post',
                title: 'First Post',
                date: '2024-01-01',
                stub: 'Short summary',
                description: 'Custom description',
                tags: ['notes'],
                categories: ['writing'],
            },
            {
                id: 'second-post',
                title: 'Second Post',
                date: '2024-02-01',
                stub: 'Fallback stub',
                description: null,
                tags: ['launch'],
                categories: [],
            },
        ]);

        const result = await buildSearchIndex();

        expect(result.pages).toHaveLength(NAV_ITEMS.length);
        expect(result.pages[0]).toEqual(
            expect.objectContaining({
                label: NAV_ITEMS[0].label,
                href: NAV_ITEMS[0].href,
            })
        );

        expect(result.posts).toHaveLength(2);
        expect(result.posts[0]).toEqual(
            expect.objectContaining({
                id: 'first-post',
                summary: 'Custom description',
                tags: ['notes'],
                categories: ['writing'],
            })
        );
        expect(result.posts[1]).toEqual(
            expect.objectContaining({
                id: 'second-post',
                summary: 'Fallback stub',
            })
        );
    });
});
