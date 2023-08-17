import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import {unified} from 'unified'
import remarkCapitalize from 'remark-capitalize';
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeFormat from "rehype-format";
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from "rehype-slug";
import rehypeStringify from 'rehype-stringify'
import rehypeToc from '@jsdevtools/rehype-toc';
import strip from 'strip-markdown'
import {remark} from "remark";
import {formatTags} from "./tags";

const postsDirectory = path.join(process.cwd(), 'posts')

export default interface PostData extends PostBase {
    useToc: boolean | undefined | null
    wordCount: number;
    contentHtml: string;
}

export interface PostSummary extends PostBase {
    id: string;
    stub: string;
}

interface PostBase {
    title: string;
    date: string;
    tags?: string[] | undefined | null;
    categories?: string[] | undefined | null;
}

export async function getSortedPostsData(): Promise<PostSummary[]> {
    // Get file names under /posts
    const fileNames: string[] = await fs.readdir(postsDirectory)
    const allPostsData: PostSummary[] = await Promise.all(
        fileNames.map(async (fileName) => {
            const id = fileName.replace(/\.md$/, '');
            const fullPath = path.join(postsDirectory, fileName);
            const fileContents = await fs.readFile(fullPath, 'utf8');
            const matterResult = matter(fileContents);
            const content = remark()
                .use(strip)
                .processSync(matterResult.content)
                .toString()
                .substring(0, 160) + '...';
            const tags = formatTags(matterResult.data.tags);

            return {
                id,
                stub: content,
                ...(matterResult.data as { date: string; title: string }),
                tags: tags,
            };
        })
    );

    return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getAllPostIds() {
    const fileNames = await fs.readdir(postsDirectory)
    return fileNames.map(fileName => {
export async function getAllPostIds(): Promise<{ params: { id: string } }[]> {
    return (await fs.readdir(postsDirectory))
        .map(fileName => {
        return {
            params: {
                id: fileName.replace(/\.md$/, '')
            }
        }
    });
}

function multiSplit(str, seps) {
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
    const fullPath = path.join(postsDirectory, `${id}.md`)
    const fileContents = await fs.readFile(fullPath, 'utf8')

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents)
    const wordCount = multiSplit(matterResult.content, [' ', '\n'])
        .filter(x => !x.match(/^[^a-zA-Z0-9]+$/))
        .length;

    // Use remark to convert markdown into HTML string
    let builder = unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(remarkCapitalize)
        .use(rehypeHighlight)
        .use(rehypeSlug);

    if (!!matterResult.data.useToc)
        builder = builder.use(rehypeToc);

    const processedContent = await builder.use(rehypeStringify)
        .use(rehypeFormat)
        .process(matterResult.content);

    const contentHtml = processedContent.toString();
    const tags = formatTags(matterResult.data.tags);

    // Combine the data with the id and contentHtml
    // noinspection CommaExpressionJS
    return {
        id: id,
        contentHtml: contentHtml,
        ...(matterResult.data as { date: string; title: string }),
        wordCount: wordCount,
        tags: tags
    } as any as PostData;
}
