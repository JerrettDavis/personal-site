import {getAllPostMetadata, getSortedPostsData, PostSummary} from "./posts";


export interface Category {
    categoryName: string;
    categoryPath: string;
    count: number;
}

const getAllRawCategories = async (): Promise<string[]> =>
    (await getAllPostMetadata())
        .flatMap(m => Array.isArray(m.data.categories) ? m.data.categories : [])
        .filter(category => category && typeof category === 'string');

export const getAllCategories = async (): Promise<Category[]> => {
    const normalized = (await getAllRawCategories())
        .map((category) => category.trim())
        .filter((category) => category.length > 0)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    const categoryCounts = new Map<string, number>();
    normalized.forEach((category) => {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    });

    return Array.from(categoryCounts.entries()).map(([categoryName, count]) => ({
        categoryName,
        categoryPath: getCategoryPath(categoryName),
        count,
    }));
}

export const getCategoryData = async (categoryPath: string): Promise<Category> => {
    const allCategories = await getAllCategories();
    const category = allCategories.find((c: Category) => c.categoryPath === categoryPath);
    if (!category) {
        throw new Error(`Category not found: ${categoryPath}`);
    }
    return category;
}

const getCategoryPath = (categoryName: string): string =>
    categoryName
        .toLowerCase()
        .replace(/ /g, '-');

export async function getPostsForCategory(category: string): Promise<PostSummary[]> {
    const postData = (await getSortedPostsData());
    return postData
        .filter((p: PostSummary) => p.categories?.find((c: string) => c?.toLowerCase() === category.toLowerCase()));
}
