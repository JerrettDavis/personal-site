import type {PipelineEdge, PipelineLane, PipelineNode} from '../components/pipelineFlow';

export type PipelineStep = {
    id: string;
    label: string;
    title: string;
    summary: string;
    meta: string[];
};

export const PIPELINE_LANES: PipelineLane[] = [
    {id: 'source', label: 'Source', summary: 'Markdown + assets'},
    {id: 'ingest', label: 'Ingest', summary: 'Normalize + index'},
    {id: 'render', label: 'Render', summary: 'Compile + SSG'},
    {id: 'deploy', label: 'Deploy', summary: 'Vercel + CDN'},
    {id: 'observe', label: 'Observe', summary: 'Telemetry + refresh'},
];

export const PIPELINE_STEPS: PipelineStep[] = [
    {
        id: 'source',
        label: 'Source',
        title: 'Commit and content pickup',
        summary: 'Markdown, frontmatter, and assets land in git and are staged for the build graph.',
        meta: ['Inputs: posts/, docs/', 'Assets: public/ + images', 'Parallel: docs + posts'],
    },
    {
        id: 'ingest',
        label: 'Ingest',
        title: 'Normalize and index',
        summary: 'Taxonomies and search indexes build in parallel so navigation stays instant.',
        meta: ['Parallel: tags + categories', 'Search index JSON', 'Feeds + sitemap prep'],
    },
    {
        id: 'render',
        label: 'Render',
        title: 'Render and package',
        summary: 'MDX compiles to HTML while Next.js renders static pages and layout shells.',
        meta: ['remark + rehype', 'Static generation', 'Edge-ready bundles'],
    },
    {
        id: 'deploy',
        label: 'Deploy',
        title: 'Build and distribute',
        summary: 'Vercel builds, deploys, and spins preview branches for every PR.',
        meta: ['Preview deployments', 'Production deploy', 'CDN warmup'],
    },
    {
        id: 'observe',
        label: 'Observe',
        title: 'Observe and refresh',
        summary: 'Telemetry caches pipeline signals and lets visitors refresh safely.',
        meta: ['Rate-limit aware', 'Cached status panels', 'Manual refresh hooks'],
    },
];

export const PIPELINE_NODES: PipelineNode[] = [
    {id: 'markdown', lane: 'source', title: 'Markdown sources', meta: 'posts/, docs/', step: 0, order: 0, column: 0},
    {id: 'assets', lane: 'source', title: 'Media + config', meta: 'public/, images/', step: 0, order: 1, column: 0},
    {id: 'taxonomy', lane: 'ingest', title: 'Taxonomy graph', meta: 'tags + series', step: 1, order: 0, column: 1},
    {id: 'search', lane: 'ingest', title: 'Search index', meta: 'buildSearchIndex', step: 1, order: 1, column: 1},
    {id: 'mdx', lane: 'render', title: 'MDX transform', meta: 'remark/rehype', step: 2, order: 0, column: 2},
    {id: 'ssg', lane: 'render', title: 'Static render', meta: 'Next.js SSG', step: 2, order: 1, column: 3},
    {id: 'deploy', lane: 'deploy', title: 'Vercel build', meta: 'immutable artifacts', step: 3, order: 0, column: 4},
    {id: 'previews', lane: 'deploy', title: 'Preview branches', meta: 'PR deployments', step: 3, order: 1, column: 4},
    {id: 'telemetry', lane: 'observe', title: 'Telemetry cache', meta: 'cacheStore + hooks', step: 4, order: 0, column: 5},
    {id: 'status', lane: 'observe', title: 'Status surfaces', meta: '/pipelines + /work-in-progress', step: 4, order: 1, column: 6},
];

export const PIPELINE_EDGES: PipelineEdge[] = [
    {id: 'e-markdown-taxonomy', source: 'markdown', target: 'taxonomy', step: 0},
    {id: 'e-markdown-mdx', source: 'markdown', target: 'mdx', step: 0},
    {id: 'e-assets-mdx', source: 'assets', target: 'mdx', step: 0},
    {id: 'e-taxonomy-ssg', source: 'taxonomy', target: 'ssg', step: 1},
    {id: 'e-search-ssg', source: 'search', target: 'ssg', step: 1},
    {id: 'e-mdx-ssg', source: 'mdx', target: 'ssg', step: 2},
    {id: 'e-ssg-deploy', source: 'ssg', target: 'deploy', step: 3},
    {id: 'e-ssg-previews', source: 'ssg', target: 'previews', step: 3},
    {id: 'e-deploy-telemetry', source: 'deploy', target: 'telemetry', step: 4},
    {id: 'e-previews-telemetry', source: 'previews', target: 'telemetry', step: 4},
    {id: 'e-telemetry-status', source: 'telemetry', target: 'status', step: 4},
];
