import fs from 'fs'
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

const postsDirectory = path.join(process.cwd(), 'posts')

export default interface PostData {
    title: string;
    date: string;
    useToc: boolean | undefined | null
    wordCount: number;
    contentHtml: string;
    tags: string[] | undefined | null;
}

export function getSortedPostsData() {
    // Get file names under /posts
    const fileNames = fs.readdirSync(postsDirectory)
    const allPostsData = fileNames.map(fileName => {
        // Remove ".md" from file name to get id
        const id = fileName.replace(/\.md$/, '')

        // Read markdown file as string
        const fullPath = path.join(postsDirectory, fileName)
        const fileContents = fs.readFileSync(fullPath, 'utf8')

        // Use gray-matter to parse the post metadata section
        const matterResult = matter(fileContents)

        // Combine the data with the id
        return {
            id,
            ...(matterResult.data as { date: string; title: string })
        }
    })
    // Sort posts by date
    return allPostsData.sort((a, b) => {
        if (a.date < b.date) {
            return 1
        } else {
            return -1
        }
    })
}

export function getAllPostIds() {
    const fileNames = fs.readdirSync(postsDirectory)
    return fileNames.map(fileName => {
        return {
            params: {
                id: fileName.replace(/\.md$/, '')
            }
        }
    })
}

    function multiSplit(str, seps) {
    return seps.reduce((seg, sep) => seg.reduce(
        (out, seg) => out.concat(seg.split(sep)), []
    ), [str]).filter(x => x);
}

export async function getPostData(id: string): Promise<PostData> {
    const fullPath = path.join(postsDirectory, `${id}.md`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')

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
    const tags = matterResult.data.tags?.split(' ') || [];

    // Combine the data with the id and contentHtml
    // noinspection CommaExpressionJS
    return {
        id,
        contentHtml,
        ...(matterResult.data as { date: string; title: string },
        wordCount,
        tags)
    } as any as PostData;
}
