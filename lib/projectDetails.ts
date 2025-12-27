export interface ProjectReadmeSnapshot {
    contentHtml: string;
    truncated: boolean;
    url: string | null;
}

export interface ProjectReleaseSnapshot {
    tag: string;
    url: string;
    publishedAt: string | null;
}

export interface ProjectDetailResponse {
    repoFullName: string;
    readme: ProjectReadmeSnapshot | null;
    openIssues: number | null;
    openPulls: number | null;
    latestRelease: ProjectReleaseSnapshot | null;
    fetchedAt: string;
    error?: string | null;
    rateLimitedUntil?: string | null;
    refreshLockedUntil?: string | null;
}
