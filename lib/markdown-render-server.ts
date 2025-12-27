import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import rehypeFormat from 'rehype-format';
import rehypeToc from '@jsdevtools/rehype-toc';
import {common as lowlightCommon} from 'lowlight';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import gherkin from 'highlight.js/lib/languages/gherkin';

export const renderMarkdownServer = async (
    content: string,
    useToc: boolean,
    allowHtml = false,
): Promise<string> => {
    let builder = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, allowHtml ? {allowDangerousHtml: true} : undefined)
        .use(rehypeHighlight, {
            languages: {...lowlightCommon, dockerfile, gherkin},
            ignoreMissing: true,
        })
        .use(rehypeSlug);

    if (useToc) {
        builder = builder.use(rehypeToc);
    }

    const processed = await builder
        .use(rehypeStringify, allowHtml ? {allowDangerousHtml: true} : undefined)
        .use(rehypeFormat)
        .process(content);

    return processed.toString();
};

export const renderMarkdownServerBasic = async (
    content: string,
    allowHtml = false,
): Promise<string> => {
    const processed = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, allowHtml ? {allowDangerousHtml: true} : undefined)
        .use(rehypeSlug)
        .use(rehypeStringify, allowHtml ? {allowDangerousHtml: true} : undefined)
        .use(rehypeFormat)
        .process(content);

    return processed.toString();
};
