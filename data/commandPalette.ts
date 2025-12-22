import {NAV_ITEMS} from './nav';

export interface CommandItem {
    id: string;
    label: string;
    description: string;
    href: string;
    section: string;
    keywords?: string[];
    external?: boolean;
}

const REPO_ROOT = 'https://github.com/jerrettdavis/personal-site';

const PAGE_ITEMS: CommandItem[] = NAV_ITEMS.map((item) => ({
    id: `page-${item.href}`,
    label: item.label,
    description: item.description,
    href: item.href,
    section: 'Pages',
    keywords: item.keywords,
}));

const DOC_ITEMS: CommandItem[] = [
    {
        id: 'doc-overview',
        label: 'Docs overview',
        description: 'Documentation landing page.',
        href: '/docs',
        section: 'Docs',
        keywords: ['documentation', 'architecture'],
    },
    {
        id: 'doc-tech-stack',
        label: 'Tech stack',
        description: 'Frameworks, libraries, and services.',
        href: '/docs/tech-stack',
        section: 'Docs',
        keywords: ['stack', 'frameworks'],
    },
    {
        id: 'doc-architecture',
        label: 'Architecture',
        description: 'Routing, layout, and content structure.',
        href: '/docs/architecture',
        section: 'Docs',
        keywords: ['routing', 'layout'],
    },
    {
        id: 'doc-content-pipeline',
        label: 'Content pipeline',
        description: 'Markdown, feeds, and build outputs.',
        href: '/docs/content-pipeline',
        section: 'Docs',
        keywords: ['markdown', 'feeds', 'build'],
    },
    {
        id: 'doc-decisions',
        label: 'Decisions and tradeoffs',
        description: 'Technical choices and reasoning.',
        href: '/docs/decisions',
        section: 'Docs',
        keywords: ['tradeoffs', 'decisions'],
    },
    {
        id: 'doc-deployment',
        label: 'Deployment',
        description: 'Build and hosting details.',
        href: '/docs/deployment',
        section: 'Docs',
        keywords: ['hosting', 'vercel'],
    },
];

const REPO_ITEMS: CommandItem[] = [
    {
        id: 'repo-readme',
        label: 'README.md',
        description: 'Project overview and local development notes.',
        href: `${REPO_ROOT}/blob/main/README.md`,
        section: 'Repo',
        keywords: ['overview', 'setup'],
        external: true,
    },
    {
        id: 'repo-docs',
        label: 'docs/',
        description: 'Documentation source in the repository.',
        href: `${REPO_ROOT}/tree/main/docs`,
        section: 'Repo',
        keywords: ['documentation', 'architecture'],
        external: true,
    },
    {
        id: 'repo-posts',
        label: 'posts/',
        description: 'Markdown blog post sources.',
        href: `${REPO_ROOT}/tree/main/posts`,
        section: 'Repo',
        keywords: ['blog', 'markdown'],
        external: true,
    },
    {
        id: 'repo-layout',
        label: 'components/layout.tsx',
        description: 'Global layout and site header.',
        href: `${REPO_ROOT}/blob/main/components/layout.tsx`,
        section: 'Repo',
        keywords: ['layout', 'navigation'],
        external: true,
    },
    {
        id: 'repo-docs-lib',
        label: 'lib/docs.ts',
        description: 'Docs loader and renderer.',
        href: `${REPO_ROOT}/blob/main/lib/docs.ts`,
        section: 'Repo',
        keywords: ['docs', 'markdown'],
        external: true,
    },
    {
        id: 'repo-posts-lib',
        label: 'lib/posts.ts',
        description: 'Blog markdown loader and renderer.',
        href: `${REPO_ROOT}/blob/main/lib/posts.ts`,
        section: 'Repo',
        keywords: ['posts', 'markdown'],
        external: true,
    },
    {
        id: 'repo-global-css',
        label: 'styles/global.css',
        description: 'Theme tokens and base styles.',
        href: `${REPO_ROOT}/blob/main/styles/global.css`,
        section: 'Repo',
        keywords: ['styles', 'theme'],
        external: true,
    },
];

export const COMMAND_ITEMS: CommandItem[] = [
    ...PAGE_ITEMS,
    ...DOC_ITEMS,
    ...REPO_ITEMS,
];
