export type GithubWeekMetrics = {
    week: number;
    commits: number;
    additions: number;
    deletions: number;
};

export type GithubRepoSnapshot = {
    date: string;
    stars: number;
    forks: number;
    pushedAt: string | null;
};

export type GithubMetricsWeeklyTotals = {
    week: number;
    commits: number;
    additions: number;
    deletions: number;
};

export type GithubMetricsContributionDay = {
    date: string;
    count: number;
};

export type GithubMetricsContributionWindow = {
    from: string;
    to: string;
    days: GithubMetricsContributionDay[];
};

export type GithubMetricsTimelineMonth = {
    month: string;
    stars: number;
    commits: number;
};

export type GithubRepoMetrics = {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    stars: number;
    forks: number;
    pushedAt: string | null;
    visibility?: 'public' | 'private';
    updatedAt?: string | null;
    weeks: GithubWeekMetrics[];
    snapshots: GithubRepoSnapshot[];
};

export type GithubMetricsHistory = {
    generatedAt: string | null;
    user: string;
    repos: GithubRepoMetrics[];
    contributions?: GithubMetricsContributionWindow;
    progress?: GithubMetricsProgress;
};

export type GithubMetricsProgress = {
    totalRepos: number;
    processedRepos: number;
    startedAt?: string | null;
    updatedAt?: string | null;
    finishedAt?: string | null;
};

export type RangeTotals = {
    week: number;
    month: number;
    year: number;
};

export type GithubRepoMetricSummary = {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    stars: number;
    forks: number;
    pushedAt: string | null;
    metricsUpdatedAt?: string | null;
    commits: RangeTotals;
    additions: RangeTotals;
    deletions: RangeTotals;
    trendWeeks: number[];
    commitTrend: number[];
    lineTrend: number[];
};

export type GithubMetricsSummary = {
    repos: number;
    activeRepos: number;
    stars: number;
    forks: number;
    commits: RangeTotals;
    additions: RangeTotals;
    deletions: RangeTotals;
};

export type GithubMetricsResponse = {
    fetchedAt: string;
    historyUpdatedAt: string | null;
    summary: GithubMetricsSummary;
    repos: GithubRepoMetricSummary[];
    timeline?: {
        months: GithubMetricsTimelineMonth[];
        weeks: GithubMetricsWeeklyTotals[];
        days?: GithubMetricsContributionDay[];
    };
    update?: GithubMetricsUpdateState | null;
    error?: string | null;
    rateLimitedUntil?: string | null;
    refreshLockedUntil?: string | null;
};

export type GithubMetricsUpdateState = GithubMetricsProgress & {
    inProgress: boolean;
    lockDetected: boolean;
};
