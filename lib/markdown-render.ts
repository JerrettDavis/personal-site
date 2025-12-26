const dynamicImport = new Function(
    'specifier',
    'return import(specifier)',
) as (specifier: string) => Promise<unknown>;

export const renderMarkdown = async (content: string, useToc: boolean): Promise<string> => {
    const [
        unifiedModule,
        remarkParseModule,
        remarkRehypeModule,
        rehypeHighlightModule,
        rehypeSlugModule,
        rehypeStringifyModule,
        rehypeFormatModule,
        rehypeTocModule,
        lowlightModule,
        dockerfileModule,
        gherkinModule,
    ] = await Promise.all([
        dynamicImport('unified'),
        dynamicImport('remark-parse'),
        dynamicImport('remark-rehype'),
        dynamicImport('rehype-highlight'),
        dynamicImport('rehype-slug'),
        dynamicImport('rehype-stringify'),
        dynamicImport('rehype-format'),
        dynamicImport('@jsdevtools/rehype-toc'),
        dynamicImport('lowlight'),
        dynamicImport('highlight.js/lib/languages/dockerfile'),
        dynamicImport('highlight.js/lib/languages/gherkin'),
    ]);

    const {unified} = unifiedModule as typeof import('unified');
    const {default: remarkParse} = remarkParseModule as typeof import('remark-parse');
    const {default: remarkRehype} = remarkRehypeModule as typeof import('remark-rehype');
    const {default: rehypeHighlight} = rehypeHighlightModule as typeof import('rehype-highlight');
    const {default: rehypeSlug} = rehypeSlugModule as typeof import('rehype-slug');
    const {default: rehypeStringify} = rehypeStringifyModule as typeof import('rehype-stringify');
    const {default: rehypeFormat} = rehypeFormatModule as typeof import('rehype-format');
    const {default: rehypeToc} = rehypeTocModule as typeof import('@jsdevtools/rehype-toc');
    const {common} = lowlightModule as typeof import('lowlight');
    const {default: dockerfile} = dockerfileModule as typeof import('highlight.js/lib/languages/dockerfile');
    const {default: gherkin} = gherkinModule as typeof import('highlight.js/lib/languages/gherkin');

    let builder = unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(rehypeHighlight, {languages: {...common, dockerfile, gherkin}})
        .use(rehypeSlug);

    if (useToc) {
        builder = builder.use(rehypeToc);
    }

    const processed = await builder
        .use(rehypeStringify)
        .use(rehypeFormat)
        .process(content);
    return processed.toString();
};
