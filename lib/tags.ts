import path from "path";
import fs from "fs/promises";
import matter, {GrayMatterFile} from "gray-matter";
import {getSortedPostsData, PostSummary} from "./posts";

const postsDirectory = path.join(process.cwd(), 'posts')

export const formatTags = (tags: string[] | string | undefined | null): string[] => {
    if (tags === undefined || tags === null) return [];
    if (typeof tags === 'string') return tags.split(' ');
    return tags;
};

export interface TagData {
    tagName: string;
}

export async function getSortedTagsData(): Promise<TagData[]> {
    const fileNames: string[] = await fs.readdir(postsDirectory);
    const tags: string[] = (await Promise.all(
        fileNames.map(async (fileName: string) => {
            const fullPath: string = path.join(postsDirectory, fileName);
            const fileContents: string = await fs.readFile(fullPath, 'utf8');
            const matterResult: GrayMatterFile<string> = matter(fileContents);
            return formatTags(matterResult.data.tags);
        })))
        .flat();
    return Array.from(new Set(tags)).map((t: string) => <TagData>{ tagName: t });
}

export async function getAllTagIds() {
    const tags: TagData[] = await getSortedTagsData();
    return tags.map((tag: TagData) => {
        return {
            params: {
                tag: tag.tagName
            }
        }
    })
}

export async function getPostsForTag(tag: string): Promise<PostSummary[]> {
    return (await getSortedPostsData())
        .filter((p: PostSummary) => p.tags?.includes(tag));
}