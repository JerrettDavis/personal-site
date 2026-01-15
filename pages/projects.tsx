import Head from "next/head";
import Layout from "../components/layout";
import Link from "next/link";
import styles from "./projects.module.css";
import pipelineStyles from "./pipelines.module.css";
import {GetStaticProps} from "next";
import {getActiveRepos, GitHubRepo} from "../lib/github";
import {GITHUB_USERNAME, PROJECT_ACTIVITY_DAYS, PROJECTS} from "../data/projects";
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
import {useNugetMetrics} from "../lib/hooks/useNugetMetrics";
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

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {month: 'short'});
const CONTRIBUTION_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
});

const formatMonthLabel = (value: string) => {
    const date = new Date(`${value}-01T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return value;
    return `${MONTH_FORMATTER.format(date)} ${String(date.getFullYear()).slice(-2)}`;
};

const parseContributionDate = (value: string) => {
    if (!value) return null;
    const normalized = value.includes('T') ? value : `${value}T00:00:00Z`;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
};

const formatContributionDate = (value: string) => {
    const date = parseContributionDate(value);
    if (!date) return value;
    return CONTRIBUTION_FORMATTER.format(date);
};

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
    const {data: nugetData} = useNugetMetrics();
    const pipelineSummary = pipelineData?.summary;
    const pipelineRepos = pipelineData?.repos ?? [];
    const pipelineError = pipelineData?.error ?? null;
    const metricsSummary = metricsData?.summary;
    const metricsUpdate = metricsData?.update;
    const metricsRepos = metricsData?.repos ?? [];
    const metricsError = metricsData?.error ?? null;
    const nugetPackageCount = nugetData?.packages?.length ?? 0;
    const nugetDownloadsValue = !nugetData
        ? 'Loading'
        : nugetData.error
            ? 'Unavailable'
            : nugetPackageCount > 0
                ? formatNumber(nugetData.totalDownloads ?? 0)
                : 'No packages';
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
            label: 'Stars on my repos',
            value: formatNumber(metricsSummary?.stars ?? totalStars),
        },
        {
            id: 'metrics-nuget-downloads',
            label: 'NuGet downloads',
            value: nugetDownloadsValue,
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
            label: 'Stars on my repos',
            value: formatNumber(metricsSummary?.stars ?? totalStars),
        },
        {
            id: 'nuget-downloads',
            label: 'NuGet downloads',
            value: nugetDownloadsValue,
        },
        {
            id: 'repos',
            label: 'Repos started',
            value: formatNumber(metricsSummary?.repos ?? projects.length),
        },
        {
            id: 'active',
            label: 'Active repos (30d)',
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
    const autoRefreshTimeoutRef = useRef<number | null>(null);
    const autoRefreshCancelledRef = useRef(false);
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
    const timelineMonths = metricsData?.timeline?.months ?? [];
    const timelineDays = metricsData?.timeline?.days ?? [];
    const timelineMaxStars = useMemo(
        () =>
            timelineMonths.length > 0
                ? Math.max(...timelineMonths.map((month) => month.stars))
                : 1,
        [timelineMonths],
    );
    const timelineMaxCommits = useMemo(
        () =>
            timelineMonths.length > 0
                ? Math.max(...timelineMonths.map((month) => month.commits))
                : 1,
        [timelineMonths],
    );
    const heatmapDays = useMemo(
        () => timelineDays.slice(-365),
        [timelineDays],
    );
    const heatmapMax = useMemo(
        () => Math.max(...heatmapDays.map((day) => day.count), 1),
        [heatmapDays],
    );
    const heatmapStartOffset = useMemo(() => {
        if (heatmapDays.length === 0) return 0;
        const date = parseContributionDate(heatmapDays[0].date);
        return date ? date.getUTCDay() : 0;
    }, [heatmapDays]);
    const heatmapCells = useMemo(() => {
        if (heatmapDays.length === 0) return [];
        const pads = Array.from({length: heatmapStartOffset}, (_, index) => ({
            key: `pad-${index}`,
            type: 'pad' as const,
        }));
        const days = heatmapDays.map((day, index) => ({
            key: `${day.date}-${index}`,
            type: 'day' as const,
            day,
        }));
        return [...pads, ...days];
    }, [heatmapDays, heatmapStartOffset]);
    const releaseCadence = useMemo(() => {
        const nowMs = Date.now();
        const entries = projects
            .map(({repo, meta}) => {
                const detail = detailData[repo.id];
                const releaseDate = detail?.latestRelease?.publishedAt ?? null;
                const metricsRepo = metricsMap.get(repo.full_name.toLowerCase());
                const pushDate = metricsRepo?.pushedAt ?? repo.pushed_at ?? null;
                const date = releaseDate ?? pushDate;
                if (!date) return null;
                const timestamp = Date.parse(date);
                if (!Number.isFinite(timestamp)) return null;
                return {
                    id: repo.id,
                    name: meta?.displayName ?? repo.name,
                    date,
                    timestamp,
                    type: releaseDate ? 'Release' : 'Push',
                };
            })
            .filter(
                (entry): entry is NonNullable<typeof entry> => Boolean(entry),
            )
            .sort((a, b) => b.timestamp - a.timestamp);
        const maxAgeMs = entries.length
            ? Math.max(...entries.map((entry) => nowMs - entry.timestamp))
            : 1;
        return entries.slice(0, 8).map((entry) => {
            const ageDays = Math.max(
                1,
                Math.round((nowMs - entry.timestamp) / (24 * 60 * 60 * 1000)),
            );
            const ratio = maxAgeMs ? 1 - (nowMs - entry.timestamp) / maxAgeMs : 1;
            return {
                ...entry,
                ageDays,
                barPct: Math.max(0.15, ratio) * 100,
            };
        });
    }, [projects, detailData, metricsMap]);
    const stackBuckets = useMemo(() => {
        const counts = new Map<string, number>();
        const labels = new Map<string, string>();
        projects.forEach(({repo, meta}) => {
            const values = new Set<string>([
                ...(meta?.topics ?? []),
                ...(repo.topics ?? []),
                ...(repo.language ? [repo.language] : []),
            ]);
            values.forEach((value) => {
                const trimmed = value.trim();
                if (!trimmed) return;
                const key = trimmed.toLowerCase();
                if (!labels.has(key)) labels.set(key, trimmed);
                counts.set(key, (counts.get(key) ?? 0) + 1);
            });
        });
        return Array.from(counts.entries())
            .map(([key, count]) => ({
                key,
                label: labels.get(key) ?? key,
                count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [projects]);
    const stackMax = useMemo(
        () => Math.max(...stackBuckets.map((bucket) => bucket.count), 1),
        [stackBuckets],
    );

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

        autoRefreshCancelledRef.current = false;
        if (autoRefreshTimeoutRef.current !== null) {
            window.clearTimeout(autoRefreshTimeoutRef.current);
            autoRefreshTimeoutRef.current = null;
        }
        autoRefreshRef.current.running = true;
        const runQueue = async () => {
            try {
                for (const repo of staleRepos) {
                    if (autoRefreshCancelledRef.current) break;
                    autoRefreshRef.current.queued.set(repo.fullName, Date.now());
                    await handleRefreshRepo(repo.fullName);
                    if (autoRefreshCancelledRef.current) break;
                    await new Promise((resolve) => setTimeout(resolve, 1200));
                }
            } finally {
                autoRefreshRef.current.running = false;
                if (!autoRefreshCancelledRef.current) {
                    autoRefreshTimeoutRef.current = window.setTimeout(() => {
                        if (!autoRefreshCancelledRef.current) {
                            setAutoRefreshTick((prev) => prev + 1);
                        }
                    }, 1500);
                }
            }
        };
        void runQueue();
        return () => {
            autoRefreshCancelledRef.current = true;
            if (autoRefreshTimeoutRef.current !== null) {
                window.clearTimeout(autoRefreshTimeoutRef.current);
                autoRefreshTimeoutRef.current = null;
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
        if (expandedId === null) return;
        const panel = document.querySelector('[data-detail-active="true"]');
        if (!panel) return;

        const handlePointer = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (panel.contains(target)) return;
            setExpandedId(null);
        };

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setExpandedId(null);
            }
        };

        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('touchstart', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('touchstart', handlePointer);
            document.removeEventListener('keydown', handleKey);
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
                <div className={styles.heroCallouts}>
                    {pipelineSummary && (
                        <div className={styles.pipelineCallout}>
                            <div>
                                <p className={styles.pipelineKicker}>Pipelines</p>
                                <h2 className={styles.pipelineTitle}>Build telemetry</h2>
                                <p className={styles.pipelineText}>
                                    Live status across active repos. Tap in when builds are moving.
                                </p>
                            </div>
                            <div className={styles.pipelineStatsRow}>
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
                        </div>
                    )}
                    <div className={styles.metricsCallout}>
                        <div className={styles.metricsHeader}>
                            <div>
                                <p className={styles.metricsKicker}>GitHub metrics</p>
                            <h2 className={styles.metricsTitle}>Commits, stars, LOC, and NuGet</h2>
                                <p className={styles.metricsText}>
                                    Weekly activity trends across owned public repos.
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
                </div>
            </section>
            <section className={styles.storySection}>
                <div className={styles.storyHeader}>
                    <p className={styles.storyKicker}>Project pulse</p>
                    <h2 className={styles.storyTitle}>Signals across the portfolio</h2>
                    <p className={styles.storyText}>
                        A few visual cues that show how the projects evolve: star growth,
                        commit rhythm, and the tech stack mix behind the repos.
                    </p>
                </div>
                <div className={styles.storyRow}>
                    <div className={`${styles.storyPanel} ${styles.timelinePanel}`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelKicker}>Timeline ribbon</p>
                                <h3 className={styles.panelTitle}>Stars + commits by month</h3>
                            </div>
                            {timelineMonths.length > 0 && (
                                <span className={styles.panelMeta}>
                                    {timelineMonths.length} months
                                </span>
                            )}
                        </div>
                        {timelineMonths.length === 0 ? (
                            <div className={styles.panelEmpty}>Timeline data is still loading.</div>
                        ) : (
                            <div
                                className={styles.timeline}
                                role="img"
                                aria-label="Monthly stars and commits timeline"
                            >
                                {timelineMonths.map((month) => {
                                    const starHeight = Math.max(
                                        12,
                                        (month.stars / timelineMaxStars) * 90,
                                    );
                                    const dotScale = Math.max(
                                        0.6,
                                        (month.commits / timelineMaxCommits) * 1.2,
                                    );
                                    return (
                                        <div
                                            key={month.month}
                                            className={styles.timelineItem}
                                            title={`${formatMonthLabel(month.month)} · ${formatNumber(month.stars)} stars · ${formatNumber(month.commits)} commits`}
                                        >
                                            <span
                                                className={styles.timelineBar}
                                                style={{height: `${starHeight}px`}}
                                            />
                                            <span
                                                className={styles.timelineDot}
                                                style={{transform: `scale(${dotScale})`}}
                                            />
                                            <span className={styles.timelineLabel}>
                                                {formatMonthLabel(month.month)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className={`${styles.storyPanel} ${styles.heatmapPanel}`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelKicker}>Commit heatmap</p>
                                <h3 className={styles.panelTitle}>365-day contribution rhythm</h3>
                            </div>
                        </div>
                        {heatmapDays.length === 0 ? (
                            <div className={styles.panelEmpty}>Daily contribution data is still loading.</div>
                        ) : (
                            <div
                                className={styles.heatmap}
                                role="img"
                                aria-label="365-day contribution heatmap"
                            >
                                {heatmapCells.map((cell) => {
                                    if (cell.type === 'pad') {
                                        return (
                                            <span
                                                key={cell.key}
                                                className={`${styles.heatmapCell} ${styles.heatmapEmpty}`}
                                                aria-hidden="true"
                                            />
                                        );
                                    }
                                    const count = cell.day.count ?? 0;
                                    const intensity = count / heatmapMax;
                                    const opacity = Math.min(1, 0.12 + intensity * 0.88);
                                    return (
                                        <span
                                            key={cell.key}
                                            className={styles.heatmapCell}
                                            style={{opacity}}
                                            title={`${formatContributionDate(cell.day.date)} · ${formatNumber(count)} contributions`}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.storyRowSingle}>
                    <div className={`${styles.storyPanel} ${styles.storyPanelWide}`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <p className={styles.panelKicker}>Tech stack mix</p>
                                <h3 className={styles.panelTitle}>Languages + topics in active repos</h3>
                            </div>
                        </div>
                        {stackBuckets.length === 0 ? (
                            <div className={styles.panelEmpty}>Stack coverage is still loading.</div>
                        ) : (
                            <div className={styles.stackList}>
                                {stackBuckets.map((bucket) => (
                                    <div key={bucket.key} className={styles.stackRow}>
                                        <span className={styles.stackLabel}>{bucket.label}</span>
                                        <div className={styles.stackBarWrap}>
                                            <span
                                                className={styles.stackBar}
                                                style={{width: `${(bucket.count / stackMax) * 100}%`}}
                                            />
                                        </div>
                                        <span className={styles.stackValue}>{bucket.count}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                <>
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
                        const nugetPackages = detailPayload?.nugetPackages ?? null;
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
                                    data-detail-active={isExpanded ? 'true' : undefined}
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
                                                    {Array.from({length: 6}).map((_, index) => (
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
                                                    <div className={styles.detailTelemetryColumn}>
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
                                                    </div>
                                                    <div className={styles.detailTelemetryColumn}>
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
                                                        {nugetPackages !== null && (
                                                            <div className={`${styles.detailTelemetryCard} ${styles.detailTelemetryCardScroll}`}>
                                                                <span className={styles.detailLabel}>NuGet packages</span>
                                                                {nugetPackages.length > 0 ? (
                                                                    <>
                                                                        <span className={styles.detailMeta}>
                                                                            {nugetPackages.length} package
                                                                            {nugetPackages.length === 1 ? '' : 's'}
                                                                        </span>
                                                                        <div className={styles.detailListScroll}>
                                                                            <div className={styles.detailList}>
                                                                                {nugetPackages.map((pkg) => (
                                                                                    <div className={styles.detailListItem} key={pkg.id}>
                                                                                        {pkg.url ? (
                                                                                            <a
                                                                                                href={pkg.url}
                                                                                                target="_blank"
                                                                                                rel="noreferrer"
                                                                                                className={styles.detailLink}
                                                                                            >
                                                                                                {pkg.id}
                                                                                            </a>
                                                                                        ) : (
                                                                                            <span className={styles.detailValue}>{pkg.id}</span>
                                                                                        )}
                                                                                        <span className={styles.detailMeta}>
                                                                                            {formatNumber(pkg.totalDownloads)} downloads
                                                                                        </span>
                                                                                        <span className={styles.detailMeta}>
                                                                                            {pkg.version ? `v${pkg.version}` : 'Version n/a'}
                                                                                        </span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <span className={styles.detailValue}>NuGet data unavailable</span>
                                                                )}
                                                            </div>
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
                    <section className={styles.cadenceSection}>
                    <div className={styles.storyHeader}>
                        <p className={styles.storyKicker}>Release cadence</p>
                        <h2 className={styles.storyTitle}>Latest shipping moments</h2>
                        <p className={styles.storyText}>
                            The most recent releases across active repositories. When a release
                            is missing, the latest push timestamp fills in.
                        </p>
                    </div>
                    <div className={styles.storyPanel}>
                        {releaseCadence.length === 0 ? (
                            <div className={styles.panelEmpty}>Release cadence is still loading.</div>
                        ) : (
                            <div className={styles.cadenceList}>
                                {releaseCadence.map((entry) => (
                                    <div key={entry.id} className={styles.cadenceRow}>
                                        <div className={styles.cadenceTop}>
                                            <span className={styles.cadenceName}>{entry.name}</span>
                                            <span className={styles.cadenceMeta}>
                                                <DateStamp dateString={entry.date} />
                                                <span className={styles.cadenceTag}>{entry.type}</span>
                                            </span>
                                        </div>
                                        <div className={styles.cadenceTrack}>
                                            <span
                                                className={styles.cadenceBar}
                                                style={{width: `${entry.barPct}%`}}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className={styles.panelNote}>
                            Release dates show when available; otherwise the most recent push is used.
                        </p>
                    </div>
                    </section>
                </>
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
        PROJECTS.map((meta) => [meta.repo.toLowerCase(), meta])
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
