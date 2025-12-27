const dynamicImport = new Function(
    'specifier',
    'return import(specifier)',
) as (specifier: string) => Promise<unknown>;

type MarkdownModules = {
    unified: typeof import('unified').unified;
    remarkParse: typeof import('remark-parse').default;
    remarkRehype: typeof import('remark-rehype').default;
    remarkGfm: typeof import('remark-gfm').default;
    rehypeHighlight: typeof import('rehype-highlight').default;
    rehypeSlug: typeof import('rehype-slug').default;
    rehypeStringify: typeof import('rehype-stringify').default;
    rehypeFormat: typeof import('rehype-format').default;
    rehypeToc: typeof import('@jsdevtools/rehype-toc').default;
    lowlightCommon: typeof import('lowlight').common;
    dockerfile: typeof import('highlight.js/lib/languages/dockerfile').default;
    gherkin: typeof import('highlight.js/lib/languages/gherkin').default;
};

type MarkdownBasicModules = {
    unified: typeof import('unified').unified;
    remarkParse: typeof import('remark-parse').default;
    remarkRehype: typeof import('remark-rehype').default;
    remarkGfm: typeof import('remark-gfm').default;
    rehypeSlug: typeof import('rehype-slug').default;
    rehypeStringify: typeof import('rehype-stringify').default;
    rehypeFormat: typeof import('rehype-format').default;
};

let markdownModulesPromise: Promise<MarkdownModules> | null = null;
let markdownBasicModulesPromise: Promise<MarkdownBasicModules> | null = null;

const loadMarkdownModules = () => {
    if (!markdownModulesPromise) {
        markdownModulesPromise = (async () => {
            const unifiedModule = await dynamicImport('unified');
            const remarkParseModule = await dynamicImport('remark-parse');
            const remarkRehypeModule = await dynamicImport('remark-rehype');
            const remarkGfmModule = await dynamicImport('remark-gfm');
            const rehypeHighlightModule = await dynamicImport('rehype-highlight');
            const rehypeSlugModule = await dynamicImport('rehype-slug');
            const rehypeStringifyModule = await dynamicImport('rehype-stringify');
            const rehypeFormatModule = await dynamicImport('rehype-format');
            const rehypeTocModule = await dynamicImport('@jsdevtools/rehype-toc');
            const lowlightModule = await dynamicImport('lowlight');
            const dockerfileModule = await dynamicImport('highlight.js/lib/languages/dockerfile');
            const gherkinModule = await dynamicImport('highlight.js/lib/languages/gherkin');

            return {
                unified: (unifiedModule as typeof import('unified')).unified,
                remarkParse: (remarkParseModule as typeof import('remark-parse')).default,
                remarkRehype: (remarkRehypeModule as typeof import('remark-rehype')).default,
                remarkGfm: (remarkGfmModule as typeof import('remark-gfm')).default,
                rehypeHighlight: (rehypeHighlightModule as typeof import('rehype-highlight')).default,
                rehypeSlug: (rehypeSlugModule as typeof import('rehype-slug')).default,
                rehypeStringify: (rehypeStringifyModule as typeof import('rehype-stringify')).default,
                rehypeFormat: (rehypeFormatModule as typeof import('rehype-format')).default,
                rehypeToc: (rehypeTocModule as typeof import('@jsdevtools/rehype-toc')).default,
                lowlightCommon: (lowlightModule as typeof import('lowlight')).common,
                dockerfile: (dockerfileModule as typeof import('highlight.js/lib/languages/dockerfile')).default,
                gherkin: (gherkinModule as typeof import('highlight.js/lib/languages/gherkin')).default,
            };
        })();
    }

    return markdownModulesPromise;
};

const loadMarkdownBasicModules = () => {
    if (!markdownBasicModulesPromise) {
        markdownBasicModulesPromise = (async () => {
            const unifiedModule = await dynamicImport('unified');
            const remarkParseModule = await dynamicImport('remark-parse');
            const remarkRehypeModule = await dynamicImport('remark-rehype');
            const remarkGfmModule = await dynamicImport('remark-gfm');
            const rehypeSlugModule = await dynamicImport('rehype-slug');
            const rehypeStringifyModule = await dynamicImport('rehype-stringify');
            const rehypeFormatModule = await dynamicImport('rehype-format');

            return {
                unified: (unifiedModule as typeof import('unified')).unified,
                remarkParse: (remarkParseModule as typeof import('remark-parse')).default,
                remarkRehype: (remarkRehypeModule as typeof import('remark-rehype')).default,
                remarkGfm: (remarkGfmModule as typeof import('remark-gfm')).default,
                rehypeSlug: (rehypeSlugModule as typeof import('rehype-slug')).default,
                rehypeStringify: (rehypeStringifyModule as typeof import('rehype-stringify')).default,
                rehypeFormat: (rehypeFormatModule as typeof import('rehype-format')).default,
            };
        })();
    }

    return markdownBasicModulesPromise;
};

export const renderMarkdown = async (
    content: string,
    useToc: boolean,
    allowHtml = false,
): Promise<string> => {
    const {
        unified,
        remarkParse,
        remarkRehype,
        remarkGfm,
        rehypeHighlight,
        rehypeSlug,
        rehypeStringify,
        rehypeFormat,
        rehypeToc,
        lowlightCommon,
        dockerfile,
        gherkin,
    } = await loadMarkdownModules();

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

export const renderMarkdownBasic = async (
    content: string,
    allowHtml = false,
): Promise<string> => {
    const {
        unified,
        remarkParse,
        remarkRehype,
        remarkGfm,
        rehypeSlug,
        rehypeStringify,
        rehypeFormat,
    } = await loadMarkdownBasicModules();

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
