import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import {formatTags} from "./tags";
import {toSeriesSlug} from "./blog-utils";
import {buildSummary} from './markdown-summary';
import {renderMarkdown} from './markdown-render';
import {parseOrderValue} from './frontmatter';

const postsDirectory = path.join(process.cwd(), 'posts')

function normalizeSeries(series: string) {
    return series.trim().toLowerCase();
}

const readPostFileNames = async () => fs.readdir(postsDirectory);

const sortSeriesPosts = (posts: PostSummary[]) =>
    posts.slice().sort((a, b) => {
        const aOrder = a.seriesOrder ?? Number.MAX_SAFE_INTEGER;
        const bOrder = b.seriesOrder ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.date < b.date ? -1 : 1;
    });

export default interface PostData extends PostBase {
    id: string;
    useToc: boolean | undefined | null
    wordCount: number;
    contentHtml: string;
    stub: string;
}

export interface PostSummary extends PostBase {
    id: string;
    stub: string;
}

interface PostBase {
    title: string;
    date: string;
    description?: string | undefined | null;
    featured?: string | undefined | null;
    tags?: string[] | undefined | null;
    categories?: string[] | undefined | null;
    series?: string | undefined | null;
    seriesOrder?: number | undefined | null;
}

interface PostFrontmatter {
    title?: string;
    date?: string;
    description?: string | null;
    featured?: string | null;
    tags?: string[] | string | null;
    categories?: string[] | string | null;
    series?: string | null;
    seriesOrder?: number | string | null;
    useToc?: boolean;
}

interface NormalizedPostFrontmatter extends PostBase {
    useToc: boolean;
}

const normalizePostFrontmatter = (data: PostFrontmatter): NormalizedPostFrontmatter => {
    const categories = Array.isArray(data.categories)
        ? data.categories
        : (typeof data.categories === 'string' ? [data.categories] : null);

    return {
        title: data.title ?? 'Untitled',
        date: data.date ?? '',
        description: data.description ?? null,
        featured: data.featured ?? null,
        tags: formatTags(data.tags),
        categories,
        series: typeof data.series === 'string' ? data.series : null,
        seriesOrder: parseOrderValue(data.seriesOrder),
        useToc: Boolean(data.useToc),
    };
};

export async function getSortedPostsData(): Promise<PostSummary[]> {
    // Get file names under /posts
    const fileNames: string[] = await readPostFileNames();
    const allPostsData: PostSummary[] = await Promise.all(
        fileNames.map(async (fileName) => {
            const id = fileName.replace(/\.mdx$/, '');
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = await fs.readFile(fullPath, 'utf8');
            const matterResult = matter(fileContents);
            const summary = buildSummary(matterResult.content, {ensureSuffix: true});
            const normalized = normalizePostFrontmatter(matterResult.data as PostFrontmatter);
            const {useToc, ...postBase} = normalized;

            return {
                id,
                stub: summary,
                ...postBase,
            };
        })
    );

    return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAllPostIds(): Promise<{ params: { id: string } }[]> {
    return (await readPostFileNames())
        .map(fileName => {
        return {
            params: {
                id: fileName.replace(/\.mdx$/, '')
            }
        }
    });
}

export const getAllPostMetadata = async () : Promise<matter.GrayMatterFile<string>[]> =>
    await Promise.all(
        (await readPostFileNames())
            .map(async (fileName: string) => {
                const fullPath: string = path.join(postsDirectory, fileName);
                const fileContents: string = await fs.readFile(fullPath, 'utf8');
                return matter(fileContents);
            }));

function multiSplit(str: string, seps: string[]) {
    return seps.reduce((seg: string[], sep) => seg.reduce(
        (out, seg) => out.concat(seg.split(sep)), []
    ), [str]).filter(x => x);
}

const countWords = (content: string) =>
    multiSplit(content, [' ', '\n'])
        .filter(x => !x.match(/^[^a-zA-Z0-9]+$/))
        .length;

export async function getTotalPostWordCount(): Promise<number> {
    const fileNames: string[] = await readPostFileNames();
    const counts = await Promise.all(
        fileNames.map(async (fileName) => {
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = await fs.readFile(fullPath, 'utf8');
            const matterResult = matter(fileContents);
            return countWords(matterResult.content);
        })
    );
    return counts.reduce((sum, count) => sum + count, 0);
}

export async function getPostData(id: string): Promise<PostData> {
    const fullPath = path.join(postsDirectory, `${id}.mdx`)
    const fileContents = await fs.readFile(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)
    const wordCount = countWords(matterResult.content);
    const stub = buildSummary(matterResult.content, {ensureSuffix: true});
    const normalized = normalizePostFrontmatter(matterResult.data as PostFrontmatter);
    const contentHtml = await renderMarkdown(matterResult.content, normalized.useToc);

    // Combine the data with the id and contentHtml
    // noinspection CommaExpressionJS
    return {
        id,
        contentHtml,
        wordCount,
        stub,
        ...normalized,
    };
}

export interface SeriesData {
    name: string;
    posts: PostSummary[];
    currentIndex: number;
}

export interface SeriesSummary {
    name: string;
    slug: string;
    count: number;
    latestDate: string;
}

export async function getSeriesDataForPost(id: string): Promise<SeriesData | null> {
    const allPosts = await getSortedPostsData();
    const current = allPosts.find((post) => post.id === id);
    if (!current?.series) return null;

    const seriesName = current.series;
    const normalized = normalizeSeries(seriesName);
    const seriesPosts = sortSeriesPosts(
        allPosts.filter((post) => post.series && normalizeSeries(post.series) === normalized)
    );

    const currentIndex = seriesPosts.findIndex((post) => post.id === id);
    if (currentIndex === -1) return null;

    return {
        name: seriesName,
        posts: seriesPosts,
        currentIndex,
    };
}

export async function getAllSeriesSummaries(): Promise<SeriesSummary[]> {
    const allPosts = await getSortedPostsData();
    const seriesMap = new Map<string, SeriesSummary>();

    allPosts.forEach((post) => {
        if (!post.series) return;
        const slug = toSeriesSlug(post.series);
        const existing = seriesMap.get(slug);
        if (!existing) {
            seriesMap.set(slug, {
                name: post.series,
                slug,
                count: 1,
                latestDate: post.date,
            });
            return;
        }

        existing.count += 1;
        if (post.date > existing.latestDate) {
            existing.latestDate = post.date;
        }
    });

    return Array.from(seriesMap.values()).sort((a, b) =>
        a.latestDate < b.latestDate ? 1 : -1
    );
}

export async function getSeriesDataBySlug(slug: string): Promise<{ name: string; posts: PostSummary[] } | null> {
    const allPosts = await getSortedPostsData();
    const matchingPosts = allPosts.filter((post) => post.series && toSeriesSlug(post.series) === slug);
    if (matchingPosts.length === 0) return null;
    const seriesName = matchingPosts[0].series as string;
    return {
        name: seriesName,
        posts: sortSeriesPosts(matchingPosts),
    };
}
