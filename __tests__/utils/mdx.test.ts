jest.mock('../../lib/posts', () => ({
    getSortedPostsData: jest.fn(),
    getAllPostIds: jest.fn(),
}));

import {getAllPostIds, getSortedPostsData} from '../../lib/posts';
import {getPostDir, getSortedPost} from '../../utils/mdx';

describe('mdx utilities', () => {
    it('returns posts with slugs mapped from ids', async () => {
        const mockedPosts = getSortedPostsData as jest.MockedFunction<typeof getSortedPostsData>;
        mockedPosts.mockResolvedValue([
            {id: 'beta', title: 'Beta', date: '2024-02-05', stub: 'b', tags: [], categories: []},
            {id: 'alpha', title: 'Alpha', date: '2024-01-10', stub: 'a', tags: [], categories: []},
        ]);

        const posts = await getSortedPost();
        expect(posts?.[0].slug).toBe('beta');
        expect(posts?.[1].slug).toBe('alpha');
    });

    it('returns the post directory listing', async () => {
        const mockedIds = getAllPostIds as jest.MockedFunction<typeof getAllPostIds>;
        mockedIds.mockResolvedValue([
            {params: {id: 'a'}},
            {params: {id: 'b'}},
        ]);
        const dirs = await getPostDir();
        expect(dirs).toEqual(['a.mdx', 'b.mdx']);
    });
});
