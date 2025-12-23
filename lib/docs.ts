import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import {buildSummary, parseOrderValue, renderMarkdown} from './markdown';

const docsDirectory = path.join(process.cwd(), 'docs');

export interface DocSummary {
    title: string;
    description: string;
    order: number | null;
    updated: string | null;
    slug: string[];
    route: string;
}

export interface DocData extends DocSummary {
    contentHtml: string;
    useToc: boolean;
}

interface DocFrontmatter {
    title?: string;
    description?: string;
    order?: number | string;
    updated?: string;
    useToc?: boolean;
}

const fileExists = async (filePath: string) => {
    try {
        const stat = await fs.stat(filePath);
        return stat.isFile();
    } catch (error) {
        return false;
    }
};

const toTitleCase = (value: string) =>
    value
        .replace(/-/g, ' ')
        .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const buildRoute = (slug: string[]) =>
    slug.length === 0 ? '/docs' : `/docs/${slug.join('/')}`;

const toSlugParts = (filePath: string) => {
    const relativePath = path.relative(docsDirectory, filePath);
    const noExtension = relativePath.replace(/\.md$/i, '');
    const segments = noExtension.split(path.sep);
    if (segments[segments.length - 1] === 'index') {
        segments.pop();
    }
    return segments.filter(Boolean);
};

const normalizeFrontmatter = (data: DocFrontmatter, slug: string[], content: string): DocSummary & {useToc: boolean} => {
    const fallbackTitle = slug.length > 0 ? toTitleCase(slug[slug.length - 1]) : 'Documentation';
    const title = data.title && data.title.trim().length > 0 ? data.title.trim() : fallbackTitle;
    const description = data.description && data.description.trim().length > 0
        ? data.description.trim()
        : buildSummary(content);
    const order = parseOrderValue(data.order);
    const updated = data.updated && data.updated.trim().length > 0 ? data.updated.trim() : null;
    const useToc = Boolean(data.useToc);

    return {
        title,
        description,
        order,
        updated,
        slug,
        route: buildRoute(slug),
        useToc,
    };
};

const walkDocs = async (dir: string): Promise<string[]> => {
    const entries = await fs.readdir(dir, {withFileTypes: true});
    const nested = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                return walkDocs(fullPath);
            }
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
                return [fullPath];
            }
            return [];
        })
    );
    return nested.flat();
};

const renderDocMarkdown = async (content: string, useToc: boolean) => renderMarkdown(content, useToc);

const resolveDocFile = async (slug: string[]) => {
    if (slug.length === 0) {
        return path.join(docsDirectory, 'index.md');
    }

    const directPath = path.join(docsDirectory, ...slug) + '.md';
    if (await fileExists(directPath)) return directPath;

    const nestedIndex = path.join(docsDirectory, ...slug, 'index.md');
    if (await fileExists(nestedIndex)) return nestedIndex;

    throw new Error(`Documentation not found for slug: ${slug.join('/')}`);
};

export const getAllDocSummaries = async (): Promise<DocSummary[]> => {
    const files = await walkDocs(docsDirectory);
    const summaries = await Promise.all(
        files.map(async (filePath) => {
            const slug = toSlugParts(filePath);
            const content = await fs.readFile(filePath, 'utf8');
            const {data, content: body} = matter(content);
            const summary = normalizeFrontmatter(data as DocFrontmatter, slug, body);
            return {
                title: summary.title,
                description: summary.description,
                order: summary.order,
                updated: summary.updated,
                slug: summary.slug,
                route: summary.route,
            };
        })
    );

    return summaries.sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title);
    });
};

export const getAllDocSlugs = async (): Promise<string[][]> => {
    const docs = await getAllDocSummaries();
    return docs.filter((doc) => doc.slug.length > 0).map((doc) => doc.slug);
};

export const getDocBySlug = async (slug: string[]): Promise<DocData> => {
    const filePath = await resolveDocFile(slug);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const {data, content} = matter(fileContents);
    const summary = normalizeFrontmatter(data as DocFrontmatter, slug, content);
    const contentHtml = await renderDocMarkdown(content, summary.useToc);

    return {
        title: summary.title,
        description: summary.description,
        order: summary.order,
        updated: summary.updated,
        slug: summary.slug,
        route: summary.route,
        useToc: summary.useToc,
        contentHtml,
    };
};
