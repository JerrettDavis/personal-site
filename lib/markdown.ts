const stripMarkdown = (content: string) => {
    let text = content;
    text = text.replace(/```[\s\S]*?```/g, ' ');
    text = text.replace(/`[^`]*`/g, ' ');
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    text = text.replace(/^>\s?/gm, '');
    text = text.replace(/^#{1,6}\s+/gm, '');
    text = text.replace(/[*_~]+/g, '');
    text = text.replace(/^\s*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');
    text = text.replace(/\s+/g, ' ');
    return text.trim();
};

interface SummaryOptions {
    maxLength?: number;
    suffix?: string;
    ensureSuffix?: boolean;
}

export const buildSummary = (content: string, options: SummaryOptions = {}) => {
    const summary = stripMarkdown(content);
    if (!summary) return '';

    const maxLength = options.maxLength ?? 160;
    const suffix = options.suffix ?? '...';

    if (summary.length <= maxLength) {
        return options.ensureSuffix ? `${summary}${suffix}` : summary;
    }
    return `${summary.substring(0, maxLength)}${suffix}`;
};

export const parseOrderValue = (value: unknown): number | null => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
};

export const renderMarkdown = async (content: string, useToc: boolean) => {
    const dynamicImport = new Function(
        'specifier',
        'return import(specifier)',
    ) as (specifier: string) => Promise<any>;
    const [
        {unified},
        {default: remarkParse},
        {default: remarkRehype},
        {default: remarkCapitalize},
        {default: rehypeHighlight},
        {default: rehypeSlug},
        {default: rehypeStringify},
        {default: rehypeFormat},
        {default: rehypeToc},
        {common},
        {default: dockerfile},
        {default: gherkin},
    ] = await Promise.all([
        dynamicImport('unified'),
        dynamicImport('remark-parse'),
        dynamicImport('remark-rehype'),
        dynamicImport('remark-capitalize'),
        dynamicImport('rehype-highlight'),
        dynamicImport('rehype-slug'),
        dynamicImport('rehype-stringify'),
        dynamicImport('rehype-format'),
        dynamicImport('@jsdevtools/rehype-toc'),
        dynamicImport('lowlight'),
        dynamicImport('highlight.js/lib/languages/dockerfile'),
        dynamicImport('highlight.js/lib/languages/gherkin'),
    ]);

    let builder = unified()
        .use(remarkParse)
        .use(remarkRehype)
        .use(remarkCapitalize)
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
