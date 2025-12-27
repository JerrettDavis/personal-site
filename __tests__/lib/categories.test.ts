import {getAllCategories, getCategoryData, getPostsForCategory} from '../../lib/categories';
import {getAllPostMetadata, getSortedPostsData} from '../../lib/posts';

jest.mock('../../lib/posts', () => ({
    getSortedPostsData: jest.fn(),
    getAllPostMetadata: jest.fn(),
}));

beforeEach(() => {
    jest.resetAllMocks();
});

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

describe('getAllCategories', () => {
    it('normalizes, counts, and sorts categories', async () => {
        const mockedMeta = getAllPostMetadata as jest.MockedFunction<typeof getAllPostMetadata>;
        mockedMeta.mockResolvedValue([
            {id: 'one', data: {categories: ['Programming', 'Programming/Tooling', 'Programming']}},
            {id: 'two', data: {categories: ['Software Engineering', 'Programming/Tooling', '']}},
            {id: 'three', data: {categories: ['Personal', null, '  ']}},
            {id: 'four', data: {categories: 'Architecture'}},
        ]);

        const result = await getAllCategories();

        expect(result).toHaveLength(4);
        expect(result).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    categoryName: 'Programming',
                    categoryPath: 'programming',
                    count: 2,
                }),
                expect.objectContaining({
                    categoryName: 'Programming/Tooling',
                    categoryPath: 'programming/tooling',
                    count: 2,
                }),
                expect.objectContaining({
                    categoryName: 'Personal',
                    categoryPath: 'personal',
                    count: 1,
                }),
                expect.objectContaining({
                    categoryName: 'Software Engineering',
                    categoryPath: 'software-engineering',
                    count: 1,
                }),
            ]),
        );
    });
});

describe('getCategoryData', () => {
    it('returns the category for a matching path', async () => {
        const mockedMeta = getAllPostMetadata as jest.MockedFunction<typeof getAllPostMetadata>;
        mockedMeta.mockResolvedValue([
            {id: 'one', data: {categories: ['Software Engineering']}},
        ]);

        const result = await getCategoryData('software-engineering');
        expect(result.categoryName).toBe('Software Engineering');
        expect(result.count).toBe(1);
    });

    it('throws when the category is missing', async () => {
        const mockedMeta = getAllPostMetadata as jest.MockedFunction<typeof getAllPostMetadata>;
        mockedMeta.mockResolvedValue([{id: 'one', data: {categories: ['Programming']}}]);

        await expect(getCategoryData('missing')).rejects.toThrow('Category not found');
    });
});
