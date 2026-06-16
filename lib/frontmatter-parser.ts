import {load} from 'js-yaml';

export interface ParsedFrontmatter {
    data: Record<string, unknown>;
    content: string;
}

const delimiter = '---';

export const parseFrontmatter = (source: string): ParsedFrontmatter => {
    const normalized = source.replace(/^\uFEFF/, '');
    if (!normalized.startsWith(`${delimiter}\n`) && !normalized.startsWith(`${delimiter}\r\n`)) {
        return {data: {}, content: source};
    }

    const bodyStart = normalized.startsWith(`${delimiter}\r\n`) ? 5 : 4;
    const closeMatch = /\r?\n---[ \t]*(?:\r?\n|$)/.exec(normalized.slice(bodyStart));

    if (!closeMatch) {
        return {data: {}, content: source};
    }

    const closeIndex = bodyStart + closeMatch.index;
    const yaml = normalized.slice(bodyStart, closeIndex);
    const content = normalized.slice(closeIndex + closeMatch[0].length);
    const parsed = load(yaml);
    const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};

    return {data, content};
};
