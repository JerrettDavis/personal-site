export type BuildStatus = 'building' | 'queued' | 'ready' | 'error' | 'canceled' | 'unknown';

export interface BuildDeployment {
    id: string;
    url: string;
    readyState: string;
    status: BuildStatus;
    createdAt: string;
    branch: string | null;
    commitMessage: string | null;
    commitSha: string | null;
    author: string | null;
    prId: number | null;
    prUrl: string | null;
}

export interface BuildSummary {
    building: number;
    queued: number;
    failed: number;
    inProgress: number;
}

export interface SiteBuildStatusResponse {
    summary: BuildSummary;
    production: BuildDeployment | null;
    previews: BuildDeployment[];
    fetchedAt: string;
    error?: string | null;
    rateLimitedUntil?: string | null;
    refreshLockedUntil?: string | null;
}
