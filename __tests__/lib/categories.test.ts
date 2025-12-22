import {getPostsForCategory} from '../../lib/categories';
import {getSortedPostsData} from '../../lib/posts';

jest.mock('../../lib/posts', () => ({
    getSortedPostsData: jest.fn(),
    getAllPostMetadata: jest.fn(),
}));

describe('getPostsForCategory', () => {
    it('matches categories regardless of casing', async () => {
        const mockedPosts = getSortedPostsData as jest.MockedFunction<typeof getSortedPostsData>;
        mockedPosts.mockResolvedValue([
            {
                id: 'one',
                title: 'One',
                date: '2024-01-01',
                stub: 'One',
                categories: ['Architecture'],
                tags: [],
            },
            {
                id: 'two',
                title: 'Two',
                date: '2024-01-02',
                stub: 'Two',
                categories: ['Writing'],
                tags: [],
            },
        ]);

        const result = await getPostsForCategory('architecture');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('one');
    });
});
