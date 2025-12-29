import {PROJECTS_GENERATED} from './projects.generated';

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
    nugetPackages?: string[];
    accent?: string;
    featured?: boolean;
}

const mergeProjects = (primary: ProjectMeta[], secondary: ProjectMeta[]) => {
    const seen = new Set<string>();
    const merged: ProjectMeta[] = [];
    const add = (items: ProjectMeta[]) => {
        items.forEach((item) => {
            const key = (item.repo || '').toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            merged.push(item);
        });
    };
    add(primary);
    add(secondary);
    return merged;
};

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
    {
        repo: 'JD.Efcpt.Build',
        displayName: 'JD.Efcpt.Build',
        summary: 'Build-time EF Core Power Tools automation that keeps database-first models aligned with schema changes.',
        topics: ['EF Core', 'MSBuild', 'Database-first'],
        highlights: [
            'Fingerprints inputs to skip unnecessary regeneration.',
            'Supports DACPAC and live connection modes.',
            'Outputs generated models during build without manual steps.',
        ],
        primaryTag: 'jd-efcpt-build',
        tags: ['ef-core', 'database-first', 'msbuild', 'code-generation'],
        links: [
            {label: 'NuGet', url: 'https://www.nuget.org/packages/JD.Efcpt.Build'},
        ],
        nugetPackages: ['JD.Efcpt.Build'],
        accent: '#2a6a87',
    },
];

export const PROJECTS: ProjectMeta[] = mergeProjects(
    PROJECT_OVERRIDES,
    PROJECTS_GENERATED as ProjectMeta[],
);
