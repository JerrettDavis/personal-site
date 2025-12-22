import {formatTags, getPostsForTag, getPostsForTags} from '../../lib/tags';
import {getSortedPostsData} from '../../lib/posts';

jest.mock('../../lib/posts', () => ({
    getSortedPostsData: jest.fn(),
    getAllPostMetadata: jest.fn(),
}));

describe('formatTags', () => {
    it('returns an empty array for nullish input', () => {
        expect(formatTags(undefined)).toEqual([]);
        expect(formatTags(null)).toEqual([]);
    });

    it('splits string tags by whitespace', () => {
        expect(formatTags('alpha beta')).toEqual(['alpha', 'beta']);
    });

    it('passes through arrays', () => {
        expect(formatTags(['alpha', 'beta'])).toEqual(['alpha', 'beta']);
    });
});

describe('getPostsForTag', () => {
    it('matches tags exactly', async () => {
        const mockedPosts = getSortedPostsData as jest.MockedFunction<typeof getSortedPostsData>;
        mockedPosts.mockResolvedValue([
            {
                id: 'one',
                title: 'One',
                date: '2024-01-01',
                stub: 'One',
                tags: ['alpha'],
                categories: [],
            },
            {
                id: 'two',
                title: 'Two',
                date: '2024-01-02',
                stub: 'Two',
                tags: ['beta'],
                categories: [],
            },
        ]);

        const result = await getPostsForTag('alpha');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('one');
    });
});

describe('getPostsForTags', () => {
    it('matches tags case-insensitively', async () => {
        const mockedPosts = getSortedPostsData as jest.MockedFunction<typeof getSortedPostsData>;
        mockedPosts.mockResolvedValue([
            {
                id: 'one',
                title: 'One',
                date: '2024-01-01',
                stub: 'One',
                tags: ['BDD', 'Testing'],
                categories: [],
            },
            {
                id: 'two',
                title: 'Two',
                date: '2024-01-02',
                stub: 'Two',
                tags: ['DevOps'],
                categories: [],
            },
        ]);

        const result = await getPostsForTags(['bdd']);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('one');
    });
});
