import {formatTags, getAllTagIds, getPostsForTag, getPostsForTags, getSortedTagsData} from '../../lib/tags';
import {getAllPostMetadata, getSortedPostsData} from '../../lib/posts';

jest.mock('../../lib/posts', () => ({
    getSortedPostsData: jest.fn(),
    getAllPostMetadata: jest.fn(),
}));

beforeEach(() => {
    jest.resetAllMocks();
});

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

    it('returns empty results for empty tag list', async () => {
        const result = await getPostsForTags([]);
        expect(result).toEqual([]);
    });
});

describe('getSortedTagsData', () => {
    it('returns unique tags from metadata', async () => {
        const mockedMeta = getAllPostMetadata as jest.MockedFunction<typeof getAllPostMetadata>;
        mockedMeta.mockResolvedValue([
            {id: 'one', data: {tags: ['alpha', 'beta']}},
            {id: 'two', data: {tags: 'alpha gamma'}},
        ]);

        const result = await getSortedTagsData();
        const tags = result.map((item) => item.tagName);
        expect(tags).toHaveLength(3);
        expect(tags).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma']));
    });
});

describe('getAllTagIds', () => {
    it('maps tags into route params', async () => {
        const mockedMeta = getAllPostMetadata as jest.MockedFunction<typeof getAllPostMetadata>;
        mockedMeta.mockResolvedValue([
            {id: 'one', data: {tags: ['alpha', 'beta']}},
        ]);

        const result = await getAllTagIds();
        expect(result).toEqual([
            {params: {tag: 'alpha'}},
            {params: {tag: 'beta'}},
        ]);
    });
});
