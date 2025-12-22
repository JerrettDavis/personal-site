import {NAV_ITEMS, NavItem} from '../data/nav';
import {getSortedPostsData} from './posts';
import type {PostSummary} from './posts';

export interface PageResult {
    label: string;
    href: string;
    description: string;
    keywords: string[];
}

export interface PostResult {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    categories: string[];
    date: string;
}

const buildPageResults = (items: NavItem[]): PageResult[] =>
    items.map((item) => ({
        label: item.label,
        href: item.href,
        description: item.description ?? '',
        keywords: item.keywords ?? [],
    }));

const buildPostResults = (posts: PostSummary[]): PostResult[] =>
    posts.map((post) => ({
        id: post.id,
        title: post.title,
        summary: (post.description && post.description.trim().length > 0) ? post.description : post.stub,
        tags: post.tags ?? [],
        categories: post.categories ?? [],
        date: post.date,
    }));

export const buildSearchIndex = async (): Promise<{ pages: PageResult[]; posts: PostResult[] }> => {
    const posts = await getSortedPostsData();
    return {
        pages: buildPageResults(NAV_ITEMS),
        posts: buildPostResults(posts),
    };
};
