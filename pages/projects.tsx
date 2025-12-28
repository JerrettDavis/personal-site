import Head from "next/head";
import Layout from "../components/layout";
import Link from "next/link";
import styles from "./projects.module.css";
import pipelineStyles from "./pipelines.module.css";
import {GetStaticProps} from "next";
import {getActiveRepos, GitHubRepo} from "../lib/github";
import {GITHUB_USERNAME, PROJECT_ACTIVITY_DAYS, PROJECT_OVERRIDES} from "../data/projects";
import type {ProjectLink, ProjectMeta} from "../data/projects";
import DateStamp from "../components/date";
import {getSortedPostsData} from "../lib/posts";
import type {PostSummary} from "../lib/posts";
import type {CSSProperties} from "react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import PostSummaries from "../components/postSummaries";
import {matchPostsByTags} from "../lib/post-matching";
import StatGrid from "../components/statGrid";
import RelatedPosts from "../components/relatedPosts";
import {usePipelineStatus} from "../lib/hooks/usePipelineStatus";
import type {PipelineRepoStatus, PipelineState} from "../lib/pipelines";
import type {ProjectDetailResponse} from "../lib/projectDetails";
import {useGithubMetrics} from "../lib/hooks/useGithubMetrics";
import type {GithubRepoMetricSummary} from "../lib/githubMetricsTypes";
import {useRouter} from "next/router";

interface ProjectCard {
    repo: GitHubRepo;
    meta: ProjectMeta | null;
    relatedPosts: PostSummary[];
}

interface ProjectsProps {
    projects: ProjectCard[];
    githubError: string | null;
    projectPosts: PostSummary[];
}

const collectTags = (meta?: ProjectMeta | null, repoTopics: string[] = []): string[] => {
    if (!meta && repoTopics.length === 0) return [];
    return [
        meta?.primaryTag,
        ...(meta?.tags ?? []),
        ...(meta?.relatedTags ?? []),
        ...repoTopics,
    ].filter((tag): tag is string => Boolean(tag));
};

const getRelatedPosts = (
    posts: PostSummary[],
    meta?: ProjectMeta | null,
    repoTopics: string[] = [],
): PostSummary[] => {
    if (!meta && repoTopics.length === 0) return [];
    const related = new Map<string, PostSummary>();

    if (meta?.relatedPosts?.length) {
        meta.relatedPosts.forEach((id: string) => {
            const post = posts.find((p) => p.id === id);
            if (post) related.set(post.id, post);
        });
    }

    const tagSet = collectTags(meta, repoTopics);
    matchPostsByTags(posts, tagSet).forEach((post) => {
        related.set(post.id, post);
    });

    return Array.from(related.values()).slice(0, 3);
};

const formatNumber = (value: number) => value.toLocaleString();

const formatDelta = (additions: number, deletions: number) =>
    `${additions >= 0 ? '+' : ''}${additions.toLocaleString()} / -${deletions.toLocaleString()}`;

const PIPELINE_ANCHOR_ID = 'pipeline-metrics';
const DENSITY_STORAGE_KEY = 'projects-density';
type DensityMode = 'tiny' | 'normal' | 'roomy';
const DENSITY_OPTIONS: {id: DensityMode; label: string}[] = [
    {id: 'tiny', label: 'Tiny'},
    {id: 'normal', label: 'Normal'},
    {id: 'roomy', label: 'Roomy'},
];

const STATUS_LABELS: Record<PipelineState, string> = {
    running: 'Running',
    passing: 'Passing',
    failing: 'Failing',
    unknown: 'Unknown',
};

type RepoRefreshResponse = {
    ok: boolean;
    message?: string;
    updatedAt?: string | null;
    refreshLockedUntil?: string | null;
    inProgress?: boolean;
};

const isMetricsRefreshLocked = (
    lockedUntil: string | null | undefined,
    nowMs: number,
) => lockedUntil ? globalThis.Date.parse(lockedUntil) > nowMs : false;

const getRunState = (runStatus: string | null, runConclusion: string | null): PipelineState => {
    if (runStatus !== 'completed') return 'running';
    if (runConclusion === 'success') return 'passing';
    if (!runConclusion) return 'unknown';
    return 'failing';
};

export default function Projects({projects, githubError, projectPosts}: ProjectsProps) {
    const router = useRouter();
    const isDev = process.env.NODE_ENV === 'development';
    const errorSummary = isDev ? githubError : 'GitHub data is temporarily unavailable.';
    const lede = 'Everything here has seen GitHub activity in the last year. Each card blends stats with my own notes, topics, and relevant writing.';
    const totalStars = projects.reduce((sum, project) => sum + (project.repo.stargazers_count ?? 0), 0);
    const featuredCount = projects.filter((project) => project.meta?.featured).length;
    const latestPushedAt = projects[0]?.repo?.pushed_at;
    const stats = [
        {id: 'active', label: 'Active repos', value: projects.length},
        {id: 'featured', label: 'Featured', value: featuredCount},
        {id: 'stars', label: 'Stars', value: totalStars},
        {id: 'latest', label: 'Latest push', value: latestPushedAt ? <DateStamp dateString={latestPushedAt} /> : '---'},
    ];
    const {
        data: pipelineData,
        state: pipelineState,
        isCached: pipelineCached,
        refresh: refreshPipelines,
        rateLimitedUntil: pipelineRateLimitedUntil,
        refreshLockedUntil: pipelineRefreshLockedUntil,
    } = usePipelineStatus();
    const {
        data: metricsData,
        state: metricsState,
        isCached: metricsCached,
        refresh: refreshMetrics,
        refreshLockedUntil: metricsRefreshLockedUntil,
    } = useGithubMetrics();
    const pipelineSummary = pipelineData?.summary;
    const pipelineRepos = pipelineData?.repos ?? [];
    const pipelineError = pipelineData?.error ?? null;
    const metricsSummary = metricsData?.summary;
    const metricsUpdate = metricsData?.update;
    const metricsRepos = metricsData?.repos ?? [];
    const metricsError = metricsData?.error ?? null;
    const metricsStats = [
        {
            id: 'metrics-commits-week',
            label: 'Commits 7d',
            value: formatNumber(metricsSummary?.commits.week ?? 0),
        },
        {
            id: 'metrics-commits-month',
            label: 'Commits 30d',
            value: formatNumber(metricsSummary?.commits.month ?? 0),
        },
        {
            id: 'metrics-lines-month',
            label: 'Lines 30d',
            value: formatDelta(
                metricsSummary?.additions.month ?? 0,
                metricsSummary?.deletions.month ?? 0,
            ),
        },
        {
            id: 'metrics-stars',
            label: 'Stars',
            value: formatNumber(metricsSummary?.stars ?? totalStars),
        },
    ];
    const pipelineOverviewStats = [
        {id: 'running', label: 'Running', value: pipelineSummary?.running ?? 0},
        {id: 'passing', label: 'Passing', value: pipelineSummary?.passing ?? 0},
        {id: 'failing', label: 'Failing', value: pipelineSummary?.failing ?? 0},
        {id: 'unknown', label: 'Unknown', value: pipelineSummary?.unknown ?? 0},
    ];
    const metricsOverviewStats = [
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
            value: formatDelta(
                metricsSummary?.additions.month ?? 0,
                metricsSummary?.deletions.month ?? 0,
            ),
        },
        {
            id: 'stars',
            label: 'Stars',
            value: formatNumber(metricsSummary?.stars ?? totalStars),
        },
        {
            id: 'active',
            label: 'Active repos',
            value: formatNumber(metricsSummary?.activeRepos ?? projects.length),
        },
    ];
    const now = Date.now();
    const isPipelineRefreshLocked = pipelineRefreshLockedUntil
        ? Date.parse(pipelineRefreshLockedUntil) > now
        : false;
    const isPipelineRateLimited = pipelineRateLimitedUntil
        ? Date.parse(pipelineRateLimitedUntil) > now
        : false;
    const progressLabel =
        metricsUpdate && metricsUpdate.totalRepos > 0
            ? `${metricsUpdate.processedRepos}/${metricsUpdate.totalRepos} repos`
            : null;
    const progressUpdatedAt = metricsUpdate?.updatedAt ?? null;
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [densityMode, setDensityMode] = useState<DensityMode>('tiny');
    const [detailData, setDetailData] = useState<Record<number, ProjectDetailResponse | null>>({});
    const [detailState, setDetailState] = useState<Record<number, 'idle' | 'loading' | 'ready' | 'error'>>({});
    const detailInFlight = useRef(new Map<number, Promise<ProjectDetailResponse | null>>());
    const cardRefs = useRef(new Map<number, HTMLElement>());
    const pendingScrollRef = useRef<number | null>(null);
    const pendingScrollDelayRef = useRef<number>(0);
    const scrollTimeoutRef = useRef<number | null>(null);
    const scrollFollowupRef = useRef<number | null>(null);
    const [pipelineSpotlight, setPipelineSpotlight] = useState(false);
    const [autoRefreshTick, setAutoRefreshTick] = useState(0);
    const repoRefreshLocksRef = useRef<Record<string, string>>({});
    const autoRefreshRef = useRef<{running: boolean; queued: Map<string, number>}>({
        running: false,
        queued: new Map(),
    });
    const pipelineMap = useMemo(() => {
        const map = new Map<string, PipelineRepoStatus>();
        pipelineRepos.forEach((repo) => {
            map.set(repo.name.toLowerCase(), repo);
        });
        return map;
    }, [pipelineRepos]);
    const metricsMap = useMemo(() => {
        const map = new Map<string, GithubRepoMetricSummary>();
        metricsRepos.forEach((repo) => {
            map.set(repo.fullName.toLowerCase(), repo);
        });
        return map;
    }, [metricsRepos]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY) as DensityMode | null;
        if (stored && DENSITY_OPTIONS.some((option) => option.id === stored)) {
            setDensityMode(stored);
        }
    }, []);

    const handleDensityChange = (next: DensityMode) => {
        setDensityMode(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(DENSITY_STORAGE_KEY, next);
        }
    };

    const handleRefreshRepo = useCallback(
        async (fullName: string) => {
            const nowMs = Date.now();
            const lockedUntil = repoRefreshLocksRef.current[fullName];
            if (lockedUntil && Date.parse(lockedUntil) > nowMs) {
                return;
            }
            try {
                const response = await fetch(
                    `/api/github-metrics-repo?repo=${encodeURIComponent(fullName)}`,
                    {method: 'POST'},
                );
                const payload = (await response.json()) as RepoRefreshResponse;
                if (payload.refreshLockedUntil) {
                    repoRefreshLocksRef.current[fullName] = payload.refreshLockedUntil;
                    return;
                }
                if (payload.inProgress) {
                    const cooldownMs =
                        process.env.NODE_ENV === 'production'
                            ? 2 * 60 * 1000
                            : 60 * 1000;
                    repoRefreshLocksRef.current[fullName] = new Date(
                        nowMs + cooldownMs,
                    ).toISOString();
                    return;
                }
                if (payload.ok) {
                    const updatedAt = payload.updatedAt ?? new Date().toISOString();
                    const cooldownMs =
                        process.env.NODE_ENV === 'production'
                            ? 5 * 60 * 1000
                            : 60 * 1000;
                    repoRefreshLocksRef.current[fullName] = new Date(
                        Date.parse(updatedAt) + cooldownMs,
                    ).toISOString();
                    refreshMetrics(false);
                    return;
                }
            } catch (error) {
                console.warn('Repo metrics refresh failed', error);
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

        let cancelled = false;
        let timeoutId: number | null = null;
        autoRefreshRef.current.running = true;
        const runQueue = async () => {
            try {
                for (const repo of staleRepos) {
                    if (cancelled) break;
                    autoRefreshRef.current.queued.set(repo.fullName, Date.now());
                    await handleRefreshRepo(repo.fullName);
                    if (cancelled) break;
                    await new Promise((resolve) => setTimeout(resolve, 1200));
                }
            } finally {
                autoRefreshRef.current.running = false;
                if (!cancelled) {
                    timeoutId = window.setTimeout(() => {
                        if (!cancelled) {
                            setAutoRefreshTick((prev) => prev + 1);
                        }
                    }, 1500);
                }
            }
        };
        void runQueue();
        return () => {
            cancelled = true;
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
            autoRefreshRef.current.running = false;
        };
    }, [metricsRepos, metricsUpdate?.inProgress, handleRefreshRepo, autoRefreshTick]);

    const statusLabel = (status?: PipelineState) =>
        STATUS_LABELS[status ?? 'unknown'];

    const fetchProjectDetail = async (repo: GitHubRepo) => {
        const cached = detailData[repo.id];
        if (cached) return cached;
        const existing = detailInFlight.current.get(repo.id);
        if (existing) return existing;

        setDetailState((prev) => ({...prev, [repo.id]: 'loading'}));
        const promise = fetch(`/api/project-details?repo=${encodeURIComponent(repo.full_name)}`, {
            cache: 'no-store',
        })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return (await response.json()) as ProjectDetailResponse;
            })
            .then((payload) => {
                setDetailData((prev) => ({...prev, [repo.id]: payload}));
                setDetailState((prev) => ({
                    ...prev,
                    [repo.id]: payload.error ? 'error' : 'ready',
                }));
                return payload;
            })
            .catch(() => {
                setDetailState((prev) => ({...prev, [repo.id]: 'error'}));
                return null;
            })
            .finally(() => {
                detailInFlight.current.delete(repo.id);
            });

        detailInFlight.current.set(repo.id, promise);
        return promise;
    };

    const scrollIntoViewIfNeeded = (repoId: number) => {
        if (typeof window === 'undefined') return;
        const node = cardRefs.current.get(repoId);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const topPadding = 140;
        const bottomPadding = 160;
        const shouldScroll = rect.top < topPadding
            || rect.bottom > (window.innerHeight - bottomPadding);
        if (!shouldScroll) return;
        const target = Math.max(window.scrollY + rect.top - topPadding, 0);
        window.scrollTo({top: target, behavior: 'smooth'});
    };

    const scheduleScrollIntoView = (repoId: number, delayMs: number) => {
        if (typeof window === 'undefined') return;
        if (scrollTimeoutRef.current) {
            window.clearTimeout(scrollTimeoutRef.current);
        }
        if (scrollFollowupRef.current) {
            window.clearTimeout(scrollFollowupRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
            window.requestAnimationFrame(() => {
                scrollIntoViewIfNeeded(repoId);
            });
            scrollFollowupRef.current = window.setTimeout(() => {
                window.requestAnimationFrame(() => {
                    scrollIntoViewIfNeeded(repoId);
                });
            }, 120);
        }, delayMs);
    };

    const handleExpand = (repo: GitHubRepo) => {
        const wasExpanded = expandedId !== null;
        setExpandedId(repo.id);
        pendingScrollRef.current = repo.id;
        pendingScrollDelayRef.current = wasExpanded ? 360 : 80;
        if (!detailData[repo.id] && detailState[repo.id] !== 'loading') {
            void fetchProjectDetail(repo);
        }
    };

    useEffect(() => {
        if (expandedId === null) return;
        if (pendingScrollRef.current !== expandedId) return;
        scheduleScrollIntoView(expandedId, pendingScrollDelayRef.current);
        pendingScrollRef.current = null;
        return () => {
            if (scrollTimeoutRef.current) {
                window.clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = null;
            }
            if (scrollFollowupRef.current) {
                window.clearTimeout(scrollFollowupRef.current);
                scrollFollowupRef.current = null;
            }
        };
    }, [expandedId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!router.asPath.includes(`#${PIPELINE_ANCHOR_ID}`)) return;
        const target = document.getElementById(PIPELINE_ANCHOR_ID);
        if (!target) return;
        const topPadding = 120;
        const rect = target.getBoundingClientRect();
        const nextTop = Math.max(window.scrollY + rect.top - topPadding, 0);
        window.scrollTo({top: nextTop, behavior: 'smooth'});
        setPipelineSpotlight(true);
        const timeout = window.setTimeout(() => {
            setPipelineSpotlight(false);
        }, 1400);
        return () => {
            window.clearTimeout(timeout);
        };
    }, [router.asPath]);

    return (
        <Layout description={lede}>
            <Head>
                <title>Projects - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Projects</p>
                <h1 className={styles.title}>Active builds, fresh experiments</h1>
                <p className={styles.lede}>
                    {lede}
                </p>
                <StatGrid
                    items={stats}
                    gridClassName={styles.statsGrid}
                    itemClassName={`${styles.statCard} glowable`}
                    valueClassName={styles.statValue}
                    labelClassName={styles.statLabel}
                />
                {pipelineSummary && (
                    <div className={styles.pipelineCallout}>
                        <div>
                            <p className={styles.pipelineKicker}>Pipelines</p>
                            <h2 className={styles.pipelineTitle}>Build telemetry</h2>
                            <p className={styles.pipelineText}>
                                Live status across active repos. Tap in when builds are moving.
                            </p>
                        </div>
                        <div className={styles.pipelineStats}>
                            <span className={styles.pipelineStat} data-state="running">
                                Running {pipelineSummary.running}
                            </span>
                            <span className={styles.pipelineStat} data-state="passing">
                                Passing {pipelineSummary.passing}
                            </span>
                            <span className={styles.pipelineStat} data-state="failing">
                                Failing {pipelineSummary.failing}
                            </span>
                        </div>
                        <Link href={`/projects#${PIPELINE_ANCHOR_ID}`} className={`${styles.pipelineLink} glowable`}>
                            View pipeline metrics
                        </Link>
                    </div>
                )}
                <div className={styles.metricsCallout}>
                    <div className={styles.metricsHeader}>
                        <div>
                            <p className={styles.metricsKicker}>GitHub metrics</p>
                            <h2 className={styles.metricsTitle}>Commits, stars, and LOC</h2>
                            <p className={styles.metricsText}>
                                Weekly activity trends tied to my contributions.
                            </p>
                        </div>
                        <div className={styles.metricsMeta}>
                            <span className={styles.metricsMetaLabel}>Snapshot</span>
                            <span className={styles.metricsMetaValue}>
                                {metricsData?.historyUpdatedAt ? (
                                    <DateStamp dateString={metricsData.historyUpdatedAt} />
                                ) : metricsUpdate?.inProgress ? (
                                    'Updating'
                                ) : (
                                    'Pending'
                                )}
                            </span>
                            {metricsUpdate?.inProgress && metricsUpdate.totalRepos > 0 && (
                                <span className={styles.metricsMetaBadge}>
                                    {metricsUpdate.processedRepos}/{metricsUpdate.totalRepos} repos
                                </span>
                            )}
                        </div>
                    </div>
                    <StatGrid
                        items={metricsStats}
                        gridClassName={styles.metricsGrid}
                        itemClassName={`${styles.statCard} glowable`}
                        valueClassName={styles.statValue}
                        labelClassName={styles.statLabel}
                    />
                    <Link href={`/projects#${PIPELINE_ANCHOR_ID}`} className={`${styles.metricsLink} glowable`}>
                        View metrics detail
                    </Link>
                </div>
            </section>
            <div className={styles.densityToggle}>
                <span className={styles.densityLabel}>Density</span>
                <div className={styles.densityButtons} role="group" aria-label="Project grid density">
                    {DENSITY_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            type="button"
                            className={styles.densityButton}
                            onClick={() => handleDensityChange(option.id)}
                            aria-pressed={densityMode === option.id}
                            data-active={densityMode === option.id ? 'true' : undefined}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
            {githubError && (
                <div className={styles.notice}>
                    <h2>GitHub data unavailable</h2>
                    <p>{errorSummary}</p>
                    {isDev && (
                        <p>
                            Local dev: run <code>npm run dev</code> from the repo root. If the GitHub API blocks the
                            request, set a <code>GITHUB_TOKEN</code> environment variable.
                        </p>
                    )}
                </div>
            )}
            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <h2>No active repos found</h2>
                    <p>
                        GitHub is quiet right now or the API request failed. If this is a build step, consider adding a
                        <code>GITHUB_TOKEN</code> so the site can fetch repo data.
                    </p>
                </div>
            ) : (
                <section
                    className={styles.grid}
                    data-expanded={expandedId ? 'true' : undefined}
                    data-density={densityMode}
                >
                    {projects.map(({repo, meta, relatedPosts}) => {
                        const displayName = meta?.displayName ?? repo.name;
                        const summary = meta?.summary ?? repo.description ?? 'No description yet.';
                        const topics = Array.from(
                            new Set([...(meta?.topics ?? []), ...(repo.topics ?? [])])
                        );
                        const maxTopicPreview = 2;
                        const collapseTopics = topics.length > 3;
                        const previewTopics = collapseTopics ? topics.slice(0, maxTopicPreview) : topics;
                        const extraTopicCount = collapseTopics ? topics.length - previewTopics.length : 0;
                        const popoverTags = Array.from(
                            new Set([...(repo.language ? [repo.language] : []), ...topics])
                        );
                        const popoverId = `project-tags-${repo.id}`;
                        const pipelineStatus = pipelineMap.get(repo.name.toLowerCase());
                        const metrics = metricsMap.get(repo.full_name.toLowerCase());
                        const pipelineState = pipelineStatus?.status ?? 'unknown';
                        const pipelineLabel = statusLabel(pipelineState);
                        const pipelineClassName = pipelineState === 'running'
                            ? styles.pipelineStatusRunning
                            : pipelineState === 'passing'
                                ? styles.pipelineStatusPassing
                                : pipelineState === 'failing'
                                    ? styles.pipelineStatusFailing
                                    : styles.pipelineStatusUnknown;
                        const links = [
                            {label: 'GitHub', url: repo.html_url},
                            repo.homepage ? {label: 'Live', url: repo.homepage} : null,
                            ...(meta?.links ?? []),
                        ].filter((link): link is ProjectLink => Boolean(link));
                        const isExpanded = expandedId === repo.id;
                        const detailId = `project-detail-${repo.id}`;
                        const pipelineDetailLabel = pipelineStatus?.runName
                            ? `${pipelineLabel} - ${pipelineStatus.runName}`
                            : pipelineLabel;
                        const pipelineRunStatus = pipelineStatus?.runStatus ?? null;
                        const pipelineRunConclusion = pipelineStatus?.runConclusion ?? null;
                        const pipelineRunMeta = pipelineRunStatus
                            ? pipelineRunConclusion
                                ? `${pipelineRunStatus} · ${pipelineRunConclusion}`
                                : pipelineRunStatus
                            : null;
                        const pipelineUpdatedAt = pipelineStatus?.updatedAt ?? null;
                        const pipelineNote = pipelineStatus?.note ?? null;
                        const pipelineRuns = pipelineStatus?.runs ?? [];
                        const fallbackRun = pipelineStatus?.runUrl
                            ? {
                                id: -repo.id,
                                name: pipelineStatus.runName ?? 'Latest workflow',
                                status: pipelineStatus.runStatus ?? null,
                                conclusion: pipelineStatus.runConclusion ?? null,
                                url: pipelineStatus.runUrl ?? null,
                                updatedAt: pipelineStatus.updatedAt ?? null,
                                createdAt: null,
                                branch: null,
                                event: null,
                            }
                            : null;
                        const runItems = pipelineRuns.length > 0
                            ? pipelineRuns
                            : fallbackRun
                                ? [fallbackRun]
                                : [];
                        const detailPayload = detailData[repo.id] ?? null;
                        const detailStatus = detailState[repo.id] ?? 'idle';
                        const isDetailLoading = detailStatus === 'loading' && !detailPayload;
                        const isDetailError = detailStatus === 'error' || Boolean(detailPayload?.error);
                        const openIssues = detailPayload?.openIssues ?? null;
                        const openPulls = detailPayload?.openPulls ?? null;
                        const latestRelease = detailPayload?.latestRelease ?? null;
                        const readme = detailPayload?.readme ?? null;
                        const detailFetchedAt = detailPayload?.fetchedAt ?? null;
                        const rateLimitedUntil = detailPayload?.rateLimitedUntil ?? null;
                        const repoIssuesUrl = `${repo.html_url}/issues`;
                        const repoPullsUrl = `${repo.html_url}/pulls`;
                        const repoReleasesUrl = `${repo.html_url}/releases`;
                        const repoReadmeUrl = readme?.url ?? `${repo.html_url}#readme`;
                        const commitMetric = metrics?.commits.week ?? null;
                        const linesMetric = metrics
                            ? formatDelta(metrics.additions.month, metrics.deletions.month)
                            : null;

                        const cardStyle = {
                            '--accent': meta?.accent ?? 'var(--color-primary)',
                        } as CSSProperties;

                        return (
                            <article
                                className={`${styles.projectCard} ${meta?.featured ? styles.projectCardFeatured : ''} ${isExpanded ? styles.projectCardExpanded : ''} glowable`}
                                style={cardStyle}
                                key={repo.id}
                                data-expanded={isExpanded ? 'true' : undefined}
                                ref={(node) => {
                                    if (!node) {
                                        cardRefs.current.delete(repo.id);
                                        return;
                                    }
                                    cardRefs.current.set(repo.id, node);
                                }}
                                onClick={(event) => {
                                    const target = event.target as HTMLElement;
                                    if (target.closest('[data-detail-panel="true"]')) {
                                        return;
                                    }
                                    if (target.closest('a, button, input, textarea, select, label, summary, details')) {
                                        return;
                                    }
                                    if (isExpanded) {
                                        setExpandedId(null);
                                        return;
                                    }
                                    handleExpand(repo);
                                }}
                            >
                                <div className={styles.cardBody}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardHeaderMain}>
                                            <h2 className={styles.cardTitle}>
                                                <a href={repo.html_url} target="_blank" rel="noreferrer">
                                                    {displayName}
                                                </a>
                                            </h2>
                                            {meta?.featured && <span className={styles.cardFlag}>Featured</span>}
                                        </div>
                                        <button
                                            type="button"
                                            className={`${styles.detailToggle} glowable`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (isExpanded) {
                                                    setExpandedId(null);
                                                } else {
                                                    handleExpand(repo);
                                                }
                                            }}
                                            aria-expanded={isExpanded}
                                            aria-controls={detailId}
                                        >
                                            {isExpanded ? 'Close details' : 'View details'}
                                        </button>
                                    </div>
                                    <p className={styles.cardSummary}>{summary}</p>
                                    <div className={styles.badgeStack}>
                                        <div className={styles.badgeRow}>
                                            {repo.language && <span className={styles.badge}>{repo.language}</span>}
                                            {previewTopics.map((topic) => (
                                                <span className={styles.badge} key={topic}>
                                                    {topic}
                                                </span>
                                            ))}
                                            {collapseTopics && (
                                                <span className={styles.badgeMoreWrap}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.badge} ${styles.badgeMore}`}
                                                        aria-label={`Show all tags for ${displayName}`}
                                                        aria-describedby={popoverId}
                                                    >
                                                        +{extraTopicCount} more
                                                    </button>
                                                    <div className={styles.badgePopover} id={popoverId} role="tooltip">
                                                        <div className={styles.badgePopoverInner}>
                                                            {popoverTags.map((tag) => (
                                                                <span className={styles.badge} key={tag}>
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {meta?.highlights?.length ? (
                                        <ul className={styles.highlightList}>
                                            {meta.highlights.map((highlight) => (
                                                <li key={highlight}>{highlight}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                                <div
                                    className={styles.detailWrap}
                                    id={detailId}
                                    role="region"
                                    aria-label={`${displayName} details`}
                                    aria-hidden={!isExpanded}
                                    data-detail-panel="true"
                                >
                                    <div className={styles.detailInner}>
                                        <div className={styles.detailHeader}>
                                            <div>
                                                <p className={styles.detailKicker}>Detail view</p>
                                                <h3 className={styles.detailTitle}>Signals and context</h3>
                                                {detailFetchedAt && (
                                                    <span className={styles.detailStamp}>
                                                        Updated <DateStamp dateString={detailFetchedAt} />
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.detailClose}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setExpandedId(null);
                                                }}
                                            >
                                                Collapse
                                            </button>
                                        </div>
                                        {isDetailLoading ? (
                                            <>
                                                <div className={styles.detailGrid}>
                                                    {Array.from({length: 4}).map((_, index) => (
                                                        <div
                                                            className={`${styles.detailItem} ${styles.detailSkeletonCard}`}
                                                            key={`detail-skeleton-${repo.id}-${index}`}
                                                        >
                                                            <span className={`${styles.skeleton} ${styles.detailSkeletonLabel}`} />
                                                            <span className={`${styles.skeleton} ${styles.detailSkeletonValue}`} />
                                                            <span className={`${styles.skeleton} ${styles.detailSkeletonMeta}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className={styles.detailReadme}>
                                                    <span className={`${styles.skeleton} ${styles.detailSkeletonLine}`} />
                                                    <span className={`${styles.skeleton} ${styles.detailSkeletonLine}`} />
                                                    <span className={`${styles.skeleton} ${styles.detailSkeletonLineShort}`} />
                                                </div>
                                                <div className={styles.detailActions}>
                                                    {Array.from({length: 3}).map((_, index) => (
                                                        <span
                                                            className={`${styles.skeleton} ${styles.detailSkeletonPill}`}
                                                            key={`detail-pill-${repo.id}-${index}`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={styles.detailGrid}>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Pipeline</span>
                                                        {pipelineStatus?.runUrl ? (
                                                            <a
                                                                href={pipelineStatus.runUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={styles.detailLink}
                                                            >
                                                                {pipelineDetailLabel}
                                                            </a>
                                                        ) : (
                                                            <span className={styles.detailValue}>{pipelineDetailLabel}</span>
                                                        )}
                                                        <span className={styles.detailMeta}>
                                                            {pipelineUpdatedAt
                                                                ? <DateStamp dateString={pipelineUpdatedAt} />
                                                                : 'No workflow run'}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Metrics</span>
                                                        <span className={styles.detailValue}>
                                                            {metrics
                                                                ? `${formatNumber(metrics.commits.week)} commits (7d)`
                                                                : 'Loading metrics'}
                                                        </span>
                                                        <span className={styles.detailMeta}>
                                                            {metrics
                                                                ? `${formatDelta(
                                                                      metrics.additions.month,
                                                                      metrics.deletions.month,
                                                                  )} 30d`
                                                                : 'Snapshot pending'}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Activity</span>
                                                        <span className={styles.detailValue}>
                                                            Last push <DateStamp dateString={repo.pushed_at} />
                                                        </span>
                                                        <span className={styles.detailMeta}>
                                                            {repo.language ?? 'No primary language'}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Issues + PRs</span>
                                                        <span className={styles.detailValue}>
                                                            {openIssues ?? 'n/a'} issues
                                                        </span>
                                                        <span className={styles.detailMeta}>
                                                            {openPulls ?? 'n/a'} open PRs
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Latest release</span>
                                                        {latestRelease ? (
                                                            <a
                                                                href={latestRelease.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={styles.detailLink}
                                                            >
                                                                {latestRelease.tag}
                                                            </a>
                                                        ) : (
                                                            <span className={styles.detailValue}>No releases</span>
                                                        )}
                                                        <span className={styles.detailMeta}>
                                                            {latestRelease?.publishedAt
                                                                ? <DateStamp dateString={latestRelease.publishedAt} />
                                                                : '---'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div
                                                    className={styles.detailReadme}
                                                    data-truncated={readme?.truncated ? 'true' : undefined}
                                                >
                                                    <span className={styles.detailLabel}>Readme snapshot</span>
                                                    {readme?.contentHtml ? (
                                                        <div
                                                            className={styles.detailReadmeContent}
                                                            dangerouslySetInnerHTML={{__html: readme.contentHtml}}
                                                        />
                                                    ) : (
                                                        <p className={styles.detailMuted}>No readme captured.</p>
                                                    )}
                                                    <a
                                                        href={repoReadmeUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={styles.detailLink}
                                                    >
                                                        View README
                                                    </a>
                                                </div>
                                                <div className={styles.detailTelemetryGrid}>
                                                    <div className={styles.detailTelemetryCard}>
                                                        <span className={styles.detailLabel}>Pipeline run stats</span>
                                                        {pipelineStatus?.runUrl ? (
                                                            <a
                                                                href={pipelineStatus.runUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={styles.detailLink}
                                                            >
                                                                {pipelineDetailLabel}
                                                            </a>
                                                        ) : (
                                                            <span className={styles.detailValue}>
                                                                {pipelineDetailLabel}
                                                            </span>
                                                        )}
                                                        {pipelineRunMeta ? (
                                                            <span className={styles.detailMeta}>
                                                                {pipelineRunMeta}
                                                            </span>
                                                        ) : (
                                                            <span className={styles.detailMeta}>No workflow metadata</span>
                                                        )}
                                                        {pipelineUpdatedAt ? (
                                                            <span className={styles.detailMeta}>
                                                                Updated <DateStamp dateString={pipelineUpdatedAt} />
                                                            </span>
                                                        ) : (
                                                            <span className={styles.detailMeta}>No workflow run</span>
                                                        )}
                                                        {runItems.length > 0 ? (
                                                            <ul className={styles.pipelineRunList}>
                                                                {runItems.map((run) => {
                                                                    const runState = getRunState(run.status, run.conclusion);
                                                                    return (
                                                                        <li
                                                                            key={run.id}
                                                                            className={styles.pipelineRunItem}
                                                                            data-state={runState}
                                                                        >
                                                                            {run.url ? (
                                                                                <a
                                                                                    href={run.url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className={styles.pipelineRunLink}
                                                                                >
                                                                                    {run.name}
                                                                                </a>
                                                                            ) : (
                                                                                <span className={styles.pipelineRunLink}>{run.name}</span>
                                                                            )}
                                                                            <span className={styles.pipelineRunMeta}>
                                                                                {run.status ?? 'unknown'}
                                                                                {run.conclusion ? ` · ${run.conclusion}` : ''}
                                                                            </span>
                                                                            <span className={styles.pipelineRunMeta}>
                                                                                {run.updatedAt ? (
                                                                                    <DateStamp dateString={run.updatedAt} />
                                                                                ) : (
                                                                                    'n/a'
                                                                                )}
                                                                            </span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        ) : (
                                                            <p className={styles.detailMuted}>No recent runs.</p>
                                                        )}
                                                    </div>
                                                    <div className={`${styles.detailTelemetryCard} ${styles.detailTelemetryCardFixed}`}>
                                                        <span className={styles.detailLabel}>Commit activity</span>
                                                        {metrics ? (
                                                            <>
                                                                <div className={styles.detailTrendWrap}>
                                                                    <div className={styles.detailTrendGrid}>
                                                                        <MetricTrend
                                                                            label="Commits (12w)"
                                                                            values={metrics.commitTrend}
                                                                            variant="commits"
                                                                        />
                                                                        <MetricTrend
                                                                            label="Lines changed (12w)"
                                                                            values={metrics.lineTrend}
                                                                            variant="lines"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className={styles.detailTelemetryFooter}>
                                                                    <span className={styles.detailTelemetryStat}>
                                                                        7d {formatNumber(metrics.commits.week)} commits
                                                                    </span>
                                                                    <span className={styles.detailTelemetryStat}>
                                                                        30d {formatNumber(metrics.commits.month)} commits
                                                                    </span>
                                                                    <span className={styles.detailTelemetryStat}>
                                                                        365d {formatNumber(metrics.commits.year)} commits
                                                                    </span>
                                                                    <span className={styles.detailTelemetryStat}>
                                                                        30d {formatDelta(metrics.additions.month, metrics.deletions.month)} lines
                                                                    </span>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <p className={styles.detailMuted}>Metrics pending.</p>
                                                        )}
                                                        {metrics?.metricsUpdatedAt && (
                                                            <span className={styles.detailMeta}>
                                                                Updated <DateStamp dateString={metrics.metricsUpdatedAt} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {pipelineNote && (
                                                    <p className={styles.detailNote}>{pipelineNote}</p>
                                                )}
                                                {isDetailError && (
                                                    <p className={styles.detailError}>
                                                        Details unavailable. {detailPayload?.error ?? 'Try again later.'}
                                                    </p>
                                                )}
                                                {rateLimitedUntil && (
                                                    <p className={styles.detailError}>
                                                        Rate limited until <DateStamp dateString={rateLimitedUntil} />.
                                                    </p>
                                                )}
                                                <div className={styles.detailActions}>
                                                    <a
                                                        href={repoReadmeUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        Readme
                                                    </a>
                                                    <a
                                                        href={repoIssuesUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        Issues
                                                    </a>
                                                    <a
                                                        href={repoPullsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        PRs
                                                    </a>
                                                    <a
                                                        href={repoReleasesUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        Releases
                                                    </a>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <div className={styles.statsRow}>
                                        <span>{repo.stargazers_count} stars</span>
                                        <span>{repo.forks_count} forks</span>
                                        <span>
                                            Active <DateStamp dateString={repo.pushed_at}/>
                                        </span>
                                        <span className={`${styles.pipelineStatus} ${pipelineClassName}`}>
                                            <span className={styles.pipelineDot} data-state={pipelineState} />
                                            {pipelineLabel}
                                        </span>
                                    </div>
                                    <div className={styles.metricsRow}>
                                        <span>
                                            {commitMetric !== null
                                                ? `${formatNumber(commitMetric)} commits (7d)`
                                                : 'Metrics pending'}
                                        </span>
                                        {linesMetric && <span>{linesMetric} 30d</span>}
                                        {metrics?.metricsUpdatedAt && (
                                            <span>
                                                Updated <DateStamp dateString={metrics.metricsUpdatedAt} />
                                            </span>
                                        )}
                                    </div>
                                    <div className={styles.linksRow}>
                                        {links.map((link) => (
                                            <a
                                                className={`${styles.linkButton} glowable`}
                                                key={link.label}
                                                href={link.url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {link.label}
                                            </a>
                                        ))}
                                    </div>
                                    <RelatedPosts
                                        posts={relatedPosts}
                                        label="Related posts"
                                        classes={{
                                            details: styles.relatedPosts,
                                            summary: styles.relatedLabel,
                                            content: styles.relatedContent,
                                            contentInner: styles.relatedContentInner,
                                            list: styles.relatedList,
                                        }}
                                    />
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
            <section
                id={PIPELINE_ANCHOR_ID}
                className={styles.pipelineSection}
                data-section-label="Pipeline metrics"
                data-spotlight={pipelineSpotlight ? 'true' : undefined}
            >
                <div className={styles.pipelineSectionHeader}>
                    <p className={styles.pipelineSectionKicker}>Telemetry</p>
                    <h2 className={styles.pipelineSectionTitle}>Pipeline metrics</h2>
                    <p className={styles.pipelineSectionText}>
                        GitHub Actions rollups, commit velocity, and repo activity. Repo-level stats live inside each project card above.
                    </p>
                </div>
                <StatGrid
                    items={pipelineOverviewStats}
                    gridClassName={pipelineStyles.statsGrid}
                    itemClassName={`${pipelineStyles.statCard} glowable`}
                    valueClassName={pipelineStyles.statValue}
                    labelClassName={pipelineStyles.statLabel}
                />
                <div className={pipelineStyles.metaRow}>
                    <span className={pipelineStyles.metaLabel}>Last updated</span>
                    <span className={pipelineStyles.metaValue}>
                        {pipelineData?.fetchedAt ? (
                            <DateStamp dateString={pipelineData.fetchedAt} />
                        ) : (
                            'Loading'
                        )}
                    </span>
                    <button
                        type="button"
                        className={pipelineStyles.refreshButton}
                        onClick={() => refreshPipelines()}
                        disabled={pipelineState === 'loading' || isPipelineRefreshLocked || isPipelineRateLimited}
                    >
                        Refresh
                    </button>
                    {pipelineCached && <span className={pipelineStyles.metaCache}>Cached</span>}
                </div>
                {isPipelineRateLimited && pipelineRateLimitedUntil && (
                    <div className={pipelineStyles.notice}>
                        Rate limited until <DateStamp dateString={pipelineRateLimitedUntil} />.
                    </div>
                )}
                {isPipelineRefreshLocked && pipelineRefreshLockedUntil && (
                    <div className={pipelineStyles.notice}>
                        Refresh available at <DateStamp dateString={pipelineRefreshLockedUntil} />.
                    </div>
                )}
                {pipelineError && !isPipelineRateLimited && (
                    <div className={pipelineStyles.notice}>
                        <strong>GitHub status unavailable.</strong> {pipelineError}
                    </div>
                )}
                <div className={pipelineStyles.metricsSection}>
                    <div className={pipelineStyles.metricsHeader}>
                        <div>
                            <h3 className={pipelineStyles.sectionTitle}>GitHub metrics</h3>
                            <p className={pipelineStyles.metricsLead}>
                                Weekly trends for commits and code churn, scoped to my contributions.
                                Lines changed use GitHub contributor stats. Repo-level stats live in the
                                project cards above.
                            </p>
                        </div>
                        <div className={pipelineStyles.metaRow}>
                            <span className={pipelineStyles.metaLabel}>Last snapshot</span>
                            <span className={pipelineStyles.metaValue}>
                                {metricsData?.historyUpdatedAt ? (
                                    <DateStamp dateString={metricsData.historyUpdatedAt} />
                                ) : metricsUpdate?.inProgress ? (
                                    'Updating'
                                ) : (
                                    'No snapshots yet'
                                )}
                            </span>
                            {metricsUpdate?.inProgress && progressUpdatedAt && (
                                <>
                                    <span className={pipelineStyles.metaLabel}>Progress update</span>
                                    <span className={pipelineStyles.metaValue}>
                                        <DateStamp dateString={progressUpdatedAt} />
                                    </span>
                                </>
                            )}
                            <button
                                type="button"
                                className={pipelineStyles.refreshButton}
                                onClick={() => refreshMetrics()}
                                disabled={metricsState === 'loading' || isMetricsRefreshLocked(metricsRefreshLockedUntil, now)}
                            >
                                Refresh
                            </button>
                            {metricsCached && <span className={pipelineStyles.metaCache}>Cached</span>}
                        </div>
                    </div>
                    <StatGrid
                        items={metricsOverviewStats}
                        gridClassName={pipelineStyles.metricsGrid}
                        itemClassName={`${pipelineStyles.statCard} glowable`}
                        valueClassName={pipelineStyles.statValue}
                        labelClassName={pipelineStyles.statLabel}
                    />
                    {metricsUpdate?.inProgress && (
                        <div className={pipelineStyles.notice}>
                            Metrics update in progress{progressLabel ? ` (${progressLabel})` : ''}. Data will fill in as it arrives.
                        </div>
                    )}
                    {metricsError && metricsState !== 'loading' && (
                        <div className={pipelineStyles.notice}>
                            <strong>GitHub metrics unavailable.</strong> {metricsError}
                        </div>
                    )}
                    {metricsState !== 'loading' && !metricsError && metricsRepos.length === 0 && (
                        <div className={pipelineStyles.emptyState}>
                            Metrics data is still loading.
                        </div>
                    )}
                </div>
            </section>
            <section className={styles.postsSection}>
                <h2 className={styles.postsTitle}>Project tagged posts</h2>
                {projectPosts.length > 0 ? (
                    <PostSummaries postSummaries={projectPosts}/>
                ) : (
                    <div className={styles.emptyState}>
                        <p>
                            No posts tagged with project primary tags yet. Add project tags to post frontmatter to
                            surface them here.
                        </p>
                    </div>
                )}
            </section>
        </Layout>
    );
}

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
        <div className={pipelineStyles.metricsTrend}>
            <span className={pipelineStyles.metricsTrendLabel}>{label}</span>
            {values.length === 0 ? (
                <div className={pipelineStyles.metricsTrendEmpty}>No recent data.</div>
            ) : (
                <div className={pipelineStyles.metricsTrendBars} role="img" aria-label={label}>
                    {values.map((value, index) => (
                        <span
                            key={`${label}-${index}`}
                            className={pipelineStyles.metricsTrendBar}
                            data-variant={variant}
                            style={{height: `${Math.max(12, (value / maxValue) * 100)}%`}}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const getStaticProps: GetStaticProps<ProjectsProps> = async () => {
    const [{repos, error}, allPosts] = await Promise.all([
        getActiveRepos({
            username: GITHUB_USERNAME,
            lookbackDays: PROJECT_ACTIVITY_DAYS,
        }),
        getSortedPostsData(),
    ]);

    const metaMap = new Map<string, ProjectMeta>(
        PROJECT_OVERRIDES.map((meta) => [meta.repo.toLowerCase(), meta])
    );

    const projects = repos
        .map((repo) => {
            const meta = metaMap.get(repo.name.toLowerCase());
            return {
                repo,
                meta: meta ?? null,
                relatedPosts: getRelatedPosts(allPosts, meta, repo.topics ?? []),
            };
        })
        .sort((a, b) => {
            const aFeatured = a.meta?.featured ? 1 : 0;
            const bFeatured = b.meta?.featured ? 1 : 0;
            if (aFeatured !== bFeatured) return bFeatured - aFeatured;
            return a.repo.pushed_at < b.repo.pushed_at ? 1 : -1;
        });

    const projectPrimaryTags = Array.from(
        new Set(
            projects
                .map((project) => project.meta?.primaryTag)
                .filter((tag): tag is string => Boolean(tag))
        )
    );

    const projectPosts = projectPrimaryTags.length === 0
        ? []
        : matchPostsByTags(allPosts, projectPrimaryTags);

    return {
        props: {
            projects,
            githubError: error,
            projectPosts,
        },
        revalidate: 86400,
    };
};
