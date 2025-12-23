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

export const buildSummary = (content: string, options: SummaryOptions = {}): string => {
    const summary = stripMarkdown(content);
    if (!summary) return '';

    const maxLength = options.maxLength ?? 160;
    const suffix = options.suffix ?? '...';

    if (summary.length <= maxLength) {
        return options.ensureSuffix ? `${summary}${suffix}` : summary;
    }
    return `${summary.substring(0, maxLength)}${suffix}`;
};
