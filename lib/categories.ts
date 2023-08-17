import {getAllPostMetadata, getSortedPostsData, PostSummary} from "./posts";


export interface Category {
    categoryName: string;
    categoryPath: string;
    count: number;
}

const getAllRawCategories = async (): Promise<string[]> =>
    (await getAllPostMetadata())
        .flatMap(m => <string[]>m.data.categories);

export const getAllCategories = async (): Promise<Category[]> => {
    const categoryCounts: any = (await getAllRawCategories())
        .sort((a: string, b: string) => a.trim().toLowerCase().localeCompare(b.trim().toLowerCase()))
        .reduce((acc: any, cur: string) => {
            return ({...acc, [cur]: (acc[cur] || 0) + 1});
        }, {});
    const categories = Object.keys(categoryCounts);
    return categories.map((categoryName: string) => {
        return {
            categoryName: categoryName,
            categoryPath: getCategoryPath(categoryName),
            count: categoryCounts[categoryName]
        };
    });
}

export const getCategoryData = async (categoryPath: string): Promise<Category> => {
    const allCategories = await getAllCategories();
    return allCategories.find((c: Category) => c.categoryPath === categoryPath);
}

const getCategoryPath = (categoryName: string): string =>
    categoryName
        .toLowerCase()
        .replace(' ', '-');

export async function getPostsForCategory(category: string): Promise<PostSummary[]> {
    const postData = (await getSortedPostsData());
    return postData
        .filter((p: PostSummary) => p.categories.find((c: string) => c.toLowerCase() === category.toLowerCase()));
}
