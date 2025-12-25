export type PipelineState = 'running' | 'passing' | 'failing' | 'unknown';

export interface PipelineRepoStatus {
    id: number;
    name: string;
    fullName: string;
    htmlUrl: string;
    status: PipelineState;
    runName: string | null;
    runUrl: string | null;
    runStatus: string | null;
    runConclusion: string | null;
    updatedAt: string | null;
    note?: string | null;
}

export interface PipelineSummary {
    running: number;
    passing: number;
    failing: number;
    unknown: number;
    total: number;
}

export interface PipelineStatusResponse {
    summary: PipelineSummary;
    repos: PipelineRepoStatus[];
    fetchedAt: string;
    error?: string | null;
    rateLimitedUntil?: string | null;
    refreshLockedUntil?: string | null;
}
