import {GetServerSideProps} from "next";
import {getSortedPostsData, getAllSeriesSummaries} from "../lib/posts";
import {POSTS_PER_PAGE} from "../lib/blog-utils";
import {getSortedTagsData} from "../lib/tags";
import {getAllCategories} from "../lib/categories";
import {NAV_ITEMS} from "../data/nav";

type SitemapEntry = {
    loc: string;
    lastmod?: string;
};

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://jerrettdavis.com').replace(/\/$/, '');

const escapeXml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

const toIsoDate = (value?: string | null) => {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
};

const buildUrl = (path: string) => `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const buildSitemap = (entries: SitemapEntry[]) => {
    const urls = entries
        .map((entry) => {
            const lastmod = entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '';
            return `<url><loc>${escapeXml(entry.loc)}</loc>${lastmod}</url>`;
        })
        .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
};

export const getServerSideProps: GetServerSideProps = async ({res}) => {
    const [posts, tags, categories, series] = await Promise.all([
        getSortedPostsData(),
        getSortedTagsData(),
        getAllCategories(),
        getAllSeriesSummaries(),
    ]);

    const latestPostDate = posts[0]?.date;
    const latestSeriesDate = series[0]?.latestDate;
    const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

    const staticPaths = Array.from(new Set([
        '/',
        ...NAV_ITEMS.map((item) => item.href),
        '/blog/series',
    ]));

    const staticEntries: SitemapEntry[] = staticPaths.map((path) => ({
        loc: buildUrl(path),
        lastmod: path === '/blog' ? toIsoDate(latestPostDate) : path === '/blog/series' ? toIsoDate(latestSeriesDate) : undefined,
    }));

    const postEntries: SitemapEntry[] = posts.map((post) => ({
        loc: buildUrl(`/blog/posts/${post.id}`),
        lastmod: toIsoDate(post.date),
    }));

    const tagEntries: SitemapEntry[] = tags.map((tag) => ({
        loc: buildUrl(`/blog/tags/${encodeURIComponent(tag.tagName)}`),
    }));

    const categoryEntries: SitemapEntry[] = categories.map((category) => ({
        loc: buildUrl(`/blog/categories/${encodeURI(category.categoryPath)}`),
    }));

    const seriesEntries: SitemapEntry[] = series.map((entry) => ({
        loc: buildUrl(`/blog/series/${entry.slug}`),
        lastmod: toIsoDate(entry.latestDate),
    }));

    const paginationEntries: SitemapEntry[] = Array.from(
        {length: Math.max(0, totalPages - 1)},
        (_, index) => ({
            loc: buildUrl(`/blog/page/${index + 2}`),
        })
    );

    const sitemap = buildSitemap([
        ...staticEntries,
        ...paginationEntries,
        ...postEntries,
        ...tagEntries,
        ...categoryEntries,
        ...seriesEntries,
    ]);

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
    res.write(sitemap);
    res.end();

    return {
        props: {}
    };
};

export default function Sitemap() {
    return null;
}
