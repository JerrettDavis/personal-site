import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import StatGrid from '../components/statGrid';
import DateStamp from '../components/date';
import styles from './pipelines.module.css';
import type {PipelineRepoStatus} from '../lib/pipelines';
import type {GithubRepoMetricSummary} from '../lib/githubMetricsTypes';
import {usePipelineStatus} from '../lib/hooks/usePipelineStatus';
import {useGithubMetrics} from '../lib/hooks/useGithubMetrics';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faCircleInfo, faXmark} from '@fortawesome/free-solid-svg-icons';

const STATUS_LABELS: Record<string, string> = {
    running: 'Running',
    passing: 'Passing',
    failing: 'Failing',
    unknown: 'Unknown',
};

const STATUS_ICONS = {
    running: faCircleInfo,
    passing: faCheck,
    failing: faXmark,
    unknown: faCircleInfo,
};

const STATUS_ORDER: Record<string, number> = {
    running: 0,
    failing: 1,
    passing: 2,
    unknown: 3,
};

export default function Pipelines() {
    const {
        data,
        state,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    } = usePipelineStatus();
    const {
        data: metrics,
        state: metricsState,
        isCached: metricsCached,
        refresh: refreshMetrics,
        refreshLockedUntil: metricsRefreshLockedUntil,
    } = useGithubMetrics();

    const repos = data?.repos ?? [];
    const summary = data?.summary;
    const error = data?.error ?? null;
    const metricsSummary = metrics?.summary;
    const metricsError = metrics?.error ?? null;
    const metricsRepos = metrics?.repos ?? [];
    const metricsUpdate = metrics?.update ?? null;
    const now = globalThis.Date.now();
    const isRefreshLocked = refreshLockedUntil
        ? globalThis.Date.parse(refreshLockedUntil) > now
        : false;
    const isRateLimited = rateLimitedUntil
        ? globalThis.Date.parse(rateLimitedUntil) > now
        : false;
    const sortedRepos = useMemo(() => {
        return [...repos].sort((a, b) => {
            const orderA = STATUS_ORDER[a.status] ?? 99;
            const orderB = STATUS_ORDER[b.status] ?? 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });
    }, [repos]);
    const sortedMetricRepos = useMemo(() => {
        return [...metricsRepos].sort((a, b) => {
            if (a.commits.week !== b.commits.week) {
                return b.commits.week - a.commits.week;
            }
            const aPush = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
            const bPush = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
            if (aPush !== bPush) {
                return bPush - aPush;
            }
            return a.name.localeCompare(b.name);
        });
    }, [metricsRepos]);
    const [repoRefreshState, setRepoRefreshState] = useState<Record<string, RepoRefreshState>>({});
    const [autoRefreshTick, setAutoRefreshTick] = useState(0);
    const repoRefreshStateRef = useRef<Record<string, RepoRefreshState>>({});
    const autoRefreshRef = useRef<{running: boolean; queued: Map<string, number>}>({
        running: false,
        queued: new Map(),
    });

    useEffect(() => {
        repoRefreshStateRef.current = repoRefreshState;
    }, [repoRefreshState]);

    const handleRefreshRepo = useCallback(
        async (fullName: string, silent = false) => {
            const nowMs = Date.now();
            const current = repoRefreshStateRef.current[fullName];
            if (current?.lockedUntil && Date.parse(current.lockedUntil) > nowMs) {
                return;
            }
            if (!silent) {
                setRepoRefreshState((prev) => ({
                    ...prev,
                    [fullName]: {status: 'loading'},
                }));
            }
            try {
                const response = await fetch(
                    `/api/github-metrics-repo?repo=${encodeURIComponent(fullName)}`,
                    {method: 'POST'},
                );
                const payload = (await response.json()) as RepoRefreshResponse;
                if (payload.refreshLockedUntil) {
                    setRepoRefreshState((prev) => ({
                        ...prev,
                        [fullName]: {
                            status: 'locked',
                            lockedUntil: payload.refreshLockedUntil,
                            message: payload.message,
                        },
                    }));
                    return;
                }
                if (payload.inProgress) {
                    setRepoRefreshState((prev) => ({
                        ...prev,
                        [fullName]: {
                            status: 'pending',
                            message: payload.message,
                        },
                    }));
                    return;
                }
                if (payload.ok) {
                    const updatedAt = payload.updatedAt ?? new Date().toISOString();
                    const cooldownMs =
                        process.env.NODE_ENV === 'production'
                            ? 5 * 60 * 1000
                            : 60 * 1000;
                    const lockedUntil = new Date(
                        Date.parse(updatedAt) + cooldownMs,
                    ).toISOString();
                    setRepoRefreshState((prev) => ({
                        ...prev,
                        [fullName]: {
                            status: 'locked',
                            lockedUntil,
                        },
                    }));
                    refreshMetrics(false);
                    return;
                }
                setRepoRefreshState((prev) => ({
                    ...prev,
                    [fullName]: {
                        status: 'error',
                        message: payload.message ?? 'Refresh failed.',
                    },
                }));
            } catch (error) {
                setRepoRefreshState((prev) => ({
                    ...prev,
                    [fullName]: {
                        status: 'error',
                        message: `Refresh failed: ${error}`,
                    },
                }));
            }
        },
        [refreshMetrics],
    );

    useEffect(() => {
        if (metricsRepos.length === 0) return;
        if (metricsUpdate?.inProgress) return;
        if (autoRefreshRef.current.running) return;

        const nowMs = Date.now();
        const staleCutoffMs =
            process.env.NODE_ENV === 'production'
                ? 6 * 60 * 60 * 1000
                : 10 * 60 * 1000;
        const autoCooldownMs =
            process.env.NODE_ENV === 'production'
                ? 30 * 60 * 1000
                : 5 * 60 * 1000;
        const staleRepos = metricsRepos
            .filter((repo) => {
                const updatedAt = repo.metricsUpdatedAt;
                if (!updatedAt) return true;
                return nowMs - Date.parse(updatedAt) > staleCutoffMs;
            })
            .filter((repo) => {
                const lastAttempt = autoRefreshRef.current.queued.get(repo.fullName) ?? 0;
                return nowMs - lastAttempt > autoCooldownMs;
            })
            .sort((a, b) => {
                const aUpdated = a.metricsUpdatedAt ? Date.parse(a.metricsUpdatedAt) : 0;
                const bUpdated = b.metricsUpdatedAt ? Date.parse(b.metricsUpdatedAt) : 0;
                return aUpdated - bUpdated;
            })
            .slice(0, 4);

        if (staleRepos.length === 0) return;

        autoRefreshRef.current.running = true;
        const runQueue = async () => {
            for (const repo of staleRepos) {
                autoRefreshRef.current.queued.set(repo.fullName, Date.now());
                await handleRefreshRepo(repo.fullName, true);
                await new Promise((resolve) => setTimeout(resolve, 1200));
            }
            autoRefreshRef.current.running = false;
            setTimeout(() => {
                setAutoRefreshTick((prev) => prev + 1);
            }, 1500);
        };
        void runQueue();
    }, [metricsRepos, metricsUpdate?.inProgress, handleRefreshRepo, autoRefreshTick]);

    const stats = [
        {id: 'running', label: 'Running', value: summary?.running ?? 0},
        {id: 'passing', label: 'Passing', value: summary?.passing ?? 0},
        {id: 'failing', label: 'Failing', value: summary?.failing ?? 0},
        {id: 'unknown', label: 'Unknown', value: summary?.unknown ?? 0},
    ];
    const metricStats = [
        {
            id: 'commits-week',
            label: 'Commits 7d',
            value: formatNumber(metricsSummary?.commits.week ?? 0),
        },
        {
            id: 'commits-month',
            label: 'Commits 30d',
            value: formatNumber(metricsSummary?.commits.month ?? 0),
        },
        {
            id: 'commits-year',
            label: 'Commits 365d',
            value: formatNumber(metricsSummary?.commits.year ?? 0),
        },
        {
            id: 'loc-month',
            label: 'Lines 30d',
            value: formatDelta(metricsSummary?.additions.month ?? 0, metricsSummary?.deletions.month ?? 0),
        },
        {
            id: 'stars',
            label: 'Stars',
            value: formatNumber(metricsSummary?.stars ?? 0),
        },
        {
            id: 'active',
            label: 'Active repos',
            value: formatNumber(metricsSummary?.activeRepos ?? 0),
        },
    ];
    const progressLabel =
        metricsUpdate && metricsUpdate.totalRepos > 0
            ? `${metricsUpdate.processedRepos}/${metricsUpdate.totalRepos} repos`
            : null;
    const progressUpdatedAt = metricsUpdate?.updatedAt ?? null;

    return (
        <Layout description="Live build pipeline status across active GitHub repositories.">
            <Head>
                <title>Pipelines - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Telemetry</p>
                <h1 className={styles.title}>Pipeline status</h1>
                <p className={styles.lede}>
                    A real-time snapshot of GitHub Actions runs across active repos.
                </p>
                <StatGrid
                    items={stats}
                    gridClassName={styles.statsGrid}
                    itemClassName={`${styles.statCard} glowable`}
                    valueClassName={styles.statValue}
                    labelClassName={styles.statLabel}
                />
                <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Last updated</span>
                    <span className={styles.metaValue}>
                        {data?.fetchedAt ? <DateStamp dateString={data.fetchedAt} /> : 'Loading'}
                    </span>
                    <button
                        type="button"
                        className={styles.refreshButton}
                        onClick={() => refresh()}
                        disabled={state === 'loading' || isRefreshLocked || isRateLimited}
                    >
                        Refresh
                    </button>
                    {isCached && <span className={styles.metaCache}>Cached</span>}
                </div>
                {isRateLimited && rateLimitedUntil && (
                    <div className={styles.notice}>
                        Rate limited until <DateStamp dateString={rateLimitedUntil} />.
                    </div>
                )}
                {isRefreshLocked && refreshLockedUntil && (
                    <div className={styles.notice}>
                        Refresh available at <DateStamp dateString={refreshLockedUntil} />.
                    </div>
                )}
                {error && !isRateLimited && (
                    <div className={styles.notice}>
                        <strong>GitHub status unavailable.</strong> {error}
                    </div>
                )}
            </section>
            <section className={styles.repoSection}>
                <h2 className={styles.sectionTitle}>Repo activity</h2>
                <div className={styles.repoGrid}>
                    {sortedRepos.map((repo) => (
                        <RepoCard repo={repo} key={repo.id} />
                    ))}
                </div>
                {state !== 'loading' && !error && sortedRepos.length === 0 && (
                    <div className={styles.emptyState}>
                        Loading pipeline data.
                    </div>
                )}
            </section>
            <section className={styles.metricsSection}>
                <div className={styles.metricsHeader}>
                    <div>
                        <h2 className={styles.sectionTitle}>GitHub metrics</h2>
                        <p className={styles.metricsLead}>
                            Weekly trends for commits and code churn, scoped to my contributions. Lines changed use
                            GitHub contributor stats.
                        </p>
                    </div>
                <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Last snapshot</span>
                    <span className={styles.metaValue}>
                            {metrics?.historyUpdatedAt ? (
                                <DateStamp dateString={metrics.historyUpdatedAt} />
                            ) : metricsUpdate?.inProgress ? (
                                'Updating'
                            ) : (
                                'No snapshots yet'
                            )}
                    </span>
                    {metricsUpdate?.inProgress && progressUpdatedAt && (
                        <>
                            <span className={styles.metaLabel}>Progress update</span>
                            <span className={styles.metaValue}>
                                <DateStamp dateString={progressUpdatedAt} />
                            </span>
                        </>
                    )}
                    <button
                        type="button"
                        className={styles.refreshButton}
                        onClick={() => refreshMetrics()}
                        disabled={metricsState === 'loading' || isMetricsRefreshLocked(metricsRefreshLockedUntil, now)}
                        >
                            Refresh
                        </button>
                        {metricsCached && <span className={styles.metaCache}>Cached</span>}
                    </div>
                </div>
                <StatGrid
                    items={metricStats}
                    gridClassName={styles.metricsGrid}
                    itemClassName={`${styles.statCard} glowable`}
                    valueClassName={styles.statValue}
                    labelClassName={styles.statLabel}
                />
                {metricsUpdate?.inProgress && (
                    <div className={styles.notice}>
                        Metrics update in progress{progressLabel ? ` (${progressLabel})` : ''}. Data will fill in as it
                        arrives.
                    </div>
                )}
                {metricsError && metricsState !== 'loading' && (
                    <div className={styles.notice}>
                        <strong>GitHub metrics unavailable.</strong> {metricsError}
                    </div>
                )}
                <div className={styles.metricsRepoGrid}>
                    {sortedMetricRepos.map((repo) => (
                        <MetricsRepoCard
                            repo={repo}
                            key={repo.id}
                            refreshState={repoRefreshState[repo.fullName]}
                            onRefresh={() => handleRefreshRepo(repo.fullName, false)}
                        />
                    ))}
                </div>
                {metricsState !== 'loading' && !metricsError && sortedMetricRepos.length === 0 && (
                    <div className={styles.emptyState}>
                        Metrics data is still loading.
                    </div>
                )}
            </section>
        </Layout>
    );
}

const formatNumber = (value: number) => value.toLocaleString();

const formatDelta = (additions: number, deletions: number) =>
    `${additions >= 0 ? '+' : ''}${additions.toLocaleString()} / -${deletions.toLocaleString()}`;

const isMetricsRefreshLocked = (lockedUntil: string | null | undefined, nowMs: number) =>
    lockedUntil ? globalThis.Date.parse(lockedUntil) > nowMs : false;

type RepoRefreshState = {
    status: 'loading' | 'locked' | 'pending' | 'error';
    message?: string;
    lockedUntil?: string;
};

type RepoRefreshResponse = {
    ok: boolean;
    message?: string;
    updatedAt?: string | null;
    refreshLockedUntil?: string | null;
    inProgress?: boolean;
};

const RepoCard = ({repo}: {repo: PipelineRepoStatus}) => {
    const statusLabel = STATUS_LABELS[repo.status] ?? 'Unknown';
    const statusIcon = STATUS_ICONS[repo.status] ?? faCircleInfo;
    return (
        <article className={styles.repoCard} data-status={repo.status}>
            <div className={styles.repoHeader}>
                <h3 className={styles.repoTitle}>
                    <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
                        {repo.name}
                    </a>
                </h3>
                <span
                    className={styles.statusBadge}
                    data-status={repo.status}
                    aria-label={`Status: ${statusLabel}`}
                    title={statusLabel}
                >
                    <FontAwesomeIcon icon={statusIcon} />
                </span>
            </div>
            <p className={styles.repoMeta}>{repo.fullName}</p>
            <div className={styles.repoDetails}>
                {repo.runUrl ? (
                    <a href={repo.runUrl} target="_blank" rel="noreferrer" className={styles.runLink}>
                        {repo.runName ?? 'Latest workflow'}
                    </a>
                ) : (
                    <span className={styles.runPlaceholder}>No workflow runs</span>
                )}
                <span className={styles.runTime}>
                    {repo.updatedAt ? <DateStamp dateString={repo.updatedAt} /> : 'n/a'}
                </span>
            </div>
            {repo.note && <p className={styles.repoNote}>{repo.note}</p>}
        </article>
    );
};

const MetricsRepoCard = ({
    repo,
    refreshState,
    onRefresh,
}: {
    repo: GithubRepoMetricSummary;
    refreshState?: RepoRefreshState;
    onRefresh: () => void;
}) => {
    const commitLabel = `${formatNumber(repo.commits.week)}w`;
    const commitDetail = `${formatNumber(repo.commits.week)}w / ${formatNumber(repo.commits.month)}m / ${formatNumber(repo.commits.year)}y`;
    const locLabel = `${formatDelta(repo.additions.week, repo.deletions.week)} wk`;
    const now = Date.now();
    const isLocked =
        refreshState?.lockedUntil &&
        Date.parse(refreshState.lockedUntil) > now;
    const isRefreshing = refreshState?.status === 'loading';
    const isPending = refreshState?.status === 'pending';
    const showStatus =
        refreshState?.status === 'error' ||
        refreshState?.status === 'pending' ||
        (refreshState?.lockedUntil ? isLocked : false);
    return (
        <details className={styles.metricsRepoCard}>
            <summary className={styles.metricsRepoSummary}>
                <div className={styles.metricsRepoTitle}>
                    <span className={styles.metricsRepoName}>{repo.name}</span>
                    <span className={styles.metricsRepoMeta}>{repo.fullName}</span>
                </div>
                <div className={styles.metricsRepoHighlights}>
                    <span className={styles.metricsPill}>Stars {formatNumber(repo.stars)}</span>
                    <span className={styles.metricsPill}>{commitLabel}</span>
                    <span className={styles.metricsPill}>{locLabel}</span>
                </div>
            </summary>
            <div className={styles.metricsRepoDetails}>
                <div className={styles.metricsTrendGrid}>
                    <MetricTrend
                        label="Commits (12w)"
                        values={repo.commitTrend}
                        variant="commits"
                    />
                    <MetricTrend
                        label="Lines changed (12w)"
                        values={repo.lineTrend}
                        variant="lines"
                    />
                </div>
                <div className={styles.metricsRepoInfo}>
                    <div className={styles.metricsInfoRow}>
                        <span className={styles.metricsInfoLabel}>Commits</span>
                        <span className={styles.metricsInfoValue}>
                            {commitDetail}
                        </span>
                    </div>
                    <div className={styles.metricsInfoRow}>
                        <span className={styles.metricsInfoLabel}>Lines</span>
                        <span className={styles.metricsInfoValue}>
                            {formatDelta(repo.additions.month, repo.deletions.month)} 30d
                        </span>
                    </div>
                    <div className={styles.metricsInfoRow}>
                        <span className={styles.metricsInfoLabel}>Last push</span>
                        <span className={styles.metricsInfoValue}>
                            {repo.pushedAt ? <DateStamp dateString={repo.pushedAt} /> : 'n/a'}
                        </span>
                    </div>
                    <div className={styles.metricsInfoRow}>
                        <span className={styles.metricsInfoLabel}>Metrics updated</span>
                        <span className={styles.metricsInfoValue}>
                            {repo.metricsUpdatedAt ? (
                                <DateStamp dateString={repo.metricsUpdatedAt} />
                            ) : (
                                'n/a'
                            )}
                        </span>
                    </div>
                    <div className={styles.metricsInfoRow}>
                        <span className={styles.metricsInfoLabel}>Repo</span>
                        <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className={styles.metricsRepoLink}>
                            View on GitHub
                        </a>
                    </div>
                    <div className={styles.metricsRepoActions}>
                        <button
                            type="button"
                            className={styles.metricsRefreshButton}
                            onClick={onRefresh}
                            disabled={isRefreshing || isLocked || isPending}
                        >
                            {isRefreshing ? 'Refreshing' : isPending ? 'Queued' : 'Refresh repo'}
                        </button>
                        {showStatus && (
                            <span className={styles.metricsRefreshStatus}>
                                {refreshState?.status === 'error' && refreshState.message}
                                {refreshState?.status === 'pending' && (refreshState.message ?? 'Update in progress.')}
                                {refreshState?.lockedUntil && isLocked && (
                                    <>
                                        Refresh available at{' '}
                                        <DateStamp dateString={refreshState.lockedUntil} />
                                    </>
                                )}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </details>
    );
};

const MetricTrend = ({
    label,
    values,
    variant,
}: {
    label: string;
    values: number[];
    variant: 'commits' | 'lines';
}) => {
    const safeValues = values.length > 0 ? values : [0];
    const maxValue = Math.max(...safeValues, 1);
    return (
        <div className={styles.metricsTrend}>
            <span className={styles.metricsTrendLabel}>{label}</span>
            {values.length === 0 ? (
                <div className={styles.metricsTrendEmpty}>No recent data.</div>
            ) : (
                <div className={styles.metricsTrendBars} role="img" aria-label={label}>
                    {values.map((value, index) => (
                        <span
                            key={`${label}-${index}`}
                            className={styles.metricsTrendBar}
                            data-variant={variant}
                            style={{height: `${Math.max(12, (value / maxValue) * 100)}%`}}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
