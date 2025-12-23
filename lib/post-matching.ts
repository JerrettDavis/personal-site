import type {PostSummary} from './posts';

export const normalizeTag = (tag: string) => tag.trim().toLowerCase();

export const matchPostsByTags = (posts: PostSummary[], tags: string[]): PostSummary[] => {
    if (!tags || tags.length === 0) return [];
    const tagSet = new Set(tags.map(normalizeTag));
    if (tagSet.size === 0) return [];
    return posts.filter((post) => post.tags?.some((tag) => tagSet.has(normalizeTag(tag))));
};
