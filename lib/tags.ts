import {getAllPostMetadata, getSortedPostsData, PostSummary} from "./posts";

export const formatTags = (tags: string[] | string | undefined | null): string[] => {
    if (tags === undefined || tags === null) return [];
    if (typeof tags === 'string') return tags.split(' ');
    return tags;
};

export interface TagData {
    tagName: string;
}

const getAllTags = async (): Promise<string[]> =>
    Array.from(new Set((await getAllPostMetadata())
        .flatMap(m => formatTags(m.data.tags))));

export async function getSortedTagsData(): Promise<TagData[]> {
    return (await getAllTags()).map((tag: string) => {
        return {
            tagName: tag
        }
    });
}

export async function getAllTagIds() {
    const tags: string[] = await getAllTags();
    return tags.map((tag: string) => {
        return {
            params: {
                tag: tag
            }
        }
    })
}

export async function getPostsForTag(tag: string): Promise<PostSummary[]> {
    return (await getSortedPostsData())
        .filter((p: PostSummary) => p.tags?.includes(tag));
}

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

export async function getPostsForTags(tags: string[]): Promise<PostSummary[]> {
    if (!tags || tags.length === 0) return [];
    const normalizedTags = new Set(tags.map(normalizeTag));
    return (await getSortedPostsData())
        .filter((p: PostSummary) => p.tags?.some((tag: string) => normalizedTags.has(normalizeTag(tag))));
}
