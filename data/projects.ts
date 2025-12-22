export const GITHUB_USERNAME = 'jerrettdavis';
export const PROJECT_ACTIVITY_DAYS = 365;

export interface ProjectLink {
    label: string;
    url: string;
}

export interface ProjectMeta {
    repo: string;
    displayName?: string;
    summary?: string;
    topics?: string[];
    highlights?: string[];
    primaryTag?: string;
    tags?: string[];
    relatedTags?: string[];
    relatedPosts?: string[];
    links?: ProjectLink[];
    accent?: string;
    featured?: boolean;
}

export const PROJECT_OVERRIDES: ProjectMeta[] = [
    {
        repo: 'personal-site',
        displayName: 'Personal Site',
        summary: 'My Next.js and MDX powered home base, tuned for long-form writing and experiments.',
        topics: ['Next.js', 'MDX', 'Static generation'],
        primaryTag: 'personal-site',
        tags: ['architecture', 'static-generation'],
        accent: '#0a5568',
        featured: true,
    },
    {
        repo: 'tinybdd',
        displayName: 'TinyBDD',
        summary: 'A lightweight behavior-driven testing toolkit aimed at fast feedback and readable test suites.',
        topics: ['BDD', 'Testing', '.NET'],
        primaryTag: 'tinybdd',
        tags: ['bdd', 'behavior-driven-development'],
        accent: '#1c5f7a',
    },
];
