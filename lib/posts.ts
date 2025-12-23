import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import {formatTags} from "./tags";
import {toSeriesSlug} from "./blog-utils";
import {buildSummary, parseOrderValue, renderMarkdown} from './markdown';

const postsDirectory = path.join(process.cwd(), 'posts')

function normalizeSeries(series: string) {
    return series.trim().toLowerCase();
}

export default interface PostData extends PostBase {
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

export async function getSortedPostsData(): Promise<PostSummary[]> {
    // Get file names under /posts
    const fileNames: string[] = await fs.readdir(postsDirectory)
    const allPostsData: PostSummary[] = await Promise.all(
        fileNames.map(async (fileName) => {
            const id = fileName.replace(/\.mdx$/, '');
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = await fs.readFile(fullPath, 'utf8');
            const matterResult = matter(fileContents);
            const content = buildSummary(matterResult.content, {ensureSuffix: true});
            const tags = formatTags(matterResult.data.tags);
            const seriesOrder = parseOrderValue(matterResult.data.seriesOrder);

            return {
                id,
                stub: content,
                ...(matterResult.data as { date: string; title: string; description?: string | null }),
                series: typeof matterResult.data.series === 'string' ? matterResult.data.series : null,
                seriesOrder: seriesOrder,
                tags: tags,
                categories: matterResult.data.categories || null,
            };
        })
    );

    return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAllPostIds(): Promise<{ params: { id: string } }[]> {
    return (await fs.readdir(postsDirectory))
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
        (await fs.readdir(postsDirectory))
            .map(async (fileName: string) => {
                const fullPath: string = path.join(postsDirectory, fileName);
                const fileContents: string = await fs.readFile(fullPath, 'utf8');
                return matter(fileContents);
            }));

function multiSplit(str, seps) {
    return seps.reduce((seg, sep) => seg.reduce(
        (out, seg) => out.concat(seg.split(sep)), []
    ), [str]).filter(x => x);
}

export async function getPostData(id: string): Promise<PostData> {
    const fullPath = path.join(postsDirectory, `${id}.mdx`)
    const fileContents = await fs.readFile(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)
    const wordCount = multiSplit(matterResult.content, [' ', '\n'])
        .filter(x => !x.match(/^[^a-zA-Z0-9]+$/))
        .length;
    const stub = buildSummary(matterResult.content, {ensureSuffix: true});
    const contentHtml = await renderMarkdown(matterResult.content, Boolean(matterResult.data.useToc));
    const tags = formatTags(matterResult.data.tags);
    const seriesOrder = parseOrderValue(matterResult.data.seriesOrder);

    // Combine the data with the id and contentHtml
    // noinspection CommaExpressionJS
    return {
        id: id,
        contentHtml: contentHtml,
        ...(matterResult.data as { date: string; title: string; description?: string | null; featured?: string | undefined | null }),
        wordCount: wordCount,
        stub: stub,
        tags: tags,
        categories: matterResult.data.categories || null,
        series: typeof matterResult.data.series === 'string' ? matterResult.data.series : null,
        seriesOrder: seriesOrder,
    } as any as PostData;
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
    const seriesPosts = allPosts
        .filter((post) => post.series && normalizeSeries(post.series) === normalized)
        .sort((a, b) => {
            const aOrder = a.seriesOrder ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b.seriesOrder ?? Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.date < b.date ? -1 : 1;
        });

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
        posts: matchingPosts.sort((a, b) => {
            const aOrder = a.seriesOrder ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b.seriesOrder ?? Number.MAX_SAFE_INTEGER;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.date < b.date ? -1 : 1;
        }),
    };
}
