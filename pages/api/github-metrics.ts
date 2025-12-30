import type {NextApiRequest, NextApiResponse} from 'next';
import type {
    GithubMetricsHistory,
    GithubMetricsResponse,
    GithubMetricsUpdateState,
    GithubRepoMetricSummary,
    GithubMetricsSummary,
    GithubMetricsContributionDay,
    GithubMetricsTimelineMonth,
    GithubMetricsWeeklyTotals,
    GithubWeekMetrics,
    RangeTotals,
} from '../../lib/githubMetricsTypes';
import {getMetricsStore} from '../../lib/metricsStore';
import type {MetricsStore} from '../../lib/metricsStore';
import {resolveCacheConfig} from '../../lib/cacheConfig';
import {
    checkManualRefresh,
    clearInFlight,
    getCacheEntry,
    getInFlight,
    setCacheEntry,
    setInFlight,
} from '../../lib/cacheStore';

const CACHE_KEY = 'github-metrics';
const {ttlMs: CACHE_TTL_MS, staleMs: STALE_TTL_MS} = resolveCacheConfig(
    'GITHUB_METRICS_CACHE_TTL_MS',
    'GITHUB_METRICS_CACHE_STALE_MS',
);
const CACHE_CONTROL_HEADER = `public, s-maxage=${Math.ceil(
    CACHE_TTL_MS / 1000,
)}, stale-while-revalidate=${Math.ceil(STALE_TTL_MS / 1000)}`;
const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;
const TREND_WEEKS = 12;
const LOCK_STALE_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const emptyTotals = (): RangeTotals => ({week: 0, month: 0, year: 0});

const WEEK_MS = 7 * DAY_MS;
const isWithinRange = (weekSeconds: number, cutoffMs: number) => {
    const weekStart = weekSeconds * 1000;
    return weekStart + WEEK_MS >= cutoffMs;
};

const sumRange = (
    weeks: GithubWeekMetrics[],
    cutoffMs: number,
    selector: (week: GithubWeekMetrics) => number,
) =>
    weeks.reduce(
        (total, week) => (isWithinRange(week.week, cutoffMs) ? total + selector(week) : total),
        0,
    );

const buildRepoSummary = (
    repo: GithubMetricsHistory['repos'][number],
    now: number,
): GithubRepoMetricSummary => {
    const weekCutoff = now - 7 * 24 * 60 * 60 * 1000;
    const monthCutoff = now - 30 * 24 * 60 * 60 * 1000;
    const yearCutoff = now - 365 * 24 * 60 * 60 * 1000;
    const weeks = Array.isArray(repo.weeks) ? repo.weeks : [];
    const sortedWeeks = [...weeks].sort((a, b) => a.week - b.week);
    const recentWeeks = sortedWeeks.slice(-TREND_WEEKS);
    const commits: RangeTotals = {
        week: sumRange(sortedWeeks, weekCutoff, (week) => week.commits),
        month: sumRange(sortedWeeks, monthCutoff, (week) => week.commits),
        year: sumRange(sortedWeeks, yearCutoff, (week) => week.commits),
    };
    const additions: RangeTotals = {
        week: sumRange(sortedWeeks, weekCutoff, (week) => week.additions),
        month: sumRange(sortedWeeks, monthCutoff, (week) => week.additions),
        year: sumRange(sortedWeeks, yearCutoff, (week) => week.additions),
    };
    const deletions: RangeTotals = {
        week: sumRange(sortedWeeks, weekCutoff, (week) => week.deletions),
        month: sumRange(sortedWeeks, monthCutoff, (week) => week.deletions),
        year: sumRange(sortedWeeks, yearCutoff, (week) => week.deletions),
    };

    return {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        htmlUrl: repo.htmlUrl,
        stars: repo.stars,
        forks: repo.forks,
        pushedAt: repo.pushedAt,
        metricsUpdatedAt: repo.updatedAt ?? null,
        commits,
        additions,
        deletions,
        trendWeeks: recentWeeks.map((week) => week.week),
        commitTrend: recentWeeks.map((week) => week.commits),
        lineTrend: recentWeeks.map((week) => week.additions + week.deletions),
    };
};

const buildSummary = (repos: GithubRepoMetricSummary[], now: number): GithubMetricsSummary => {
    const summary: GithubMetricsSummary = {
        repos: repos.length,
        activeRepos: 0,
        stars: 0,
        forks: 0,
        commits: emptyTotals(),
        additions: emptyTotals(),
        deletions: emptyTotals(),
    };
    const activeCutoff = now - 30 * 24 * 60 * 60 * 1000;

    repos.forEach((repo) => {
        summary.stars += repo.stars;
        summary.forks += repo.forks;
        summary.commits.week += repo.commits.week;
        summary.commits.month += repo.commits.month;
        summary.commits.year += repo.commits.year;
        summary.additions.week += repo.additions.week;
        summary.additions.month += repo.additions.month;
        summary.additions.year += repo.additions.year;
        summary.deletions.week += repo.deletions.week;
        summary.deletions.month += repo.deletions.month;
        summary.deletions.year += repo.deletions.year;
        if (repo.pushedAt && new Date(repo.pushedAt).getTime() >= activeCutoff) {
            summary.activeRepos += 1;
        }
    });

    return summary;
};

const parseRetentionDays = () => {
    const raw = process.env.GITHUB_METRICS_RETENTION_DAYS;
    if (!raw) return 365;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
        console.warn(
            `Invalid GITHUB_METRICS_RETENTION_DAYS "${raw}". Using 365 days.`,
        );
        return 365;
    }
    return parsed;
};

const buildWeeklyTotals = (
    repos: GithubMetricsHistory['repos'],
    nowMs: number,
    retentionDays: number,
): GithubMetricsWeeklyTotals[] => {
    const cutoffMs = retentionDays ? nowMs - retentionDays * DAY_MS : 0;
    const totals = new Map<number, GithubMetricsWeeklyTotals>();
    repos.forEach((repo) => {
        (repo.weeks ?? []).forEach((week) => {
            const weekStartMs = week.week * 1000;
            if (cutoffMs && weekStartMs + WEEK_MS < cutoffMs) return;
            const current = totals.get(week.week) ?? {
                week: week.week,
                commits: 0,
                additions: 0,
                deletions: 0,
            };
            current.commits += week.commits;
            current.additions += week.additions;
            current.deletions += week.deletions;
            totals.set(week.week, current);
        });
    });
    const allWeeks = Array.from(totals.values()).sort((a, b) => a.week - b.week);
    if (!retentionDays) return allWeeks;
    const retentionWeeks = Math.ceil(retentionDays / 7);
    const maxWeeks = Math.min(retentionWeeks, 104);
    return allWeeks.slice(-maxWeeks);
};

const buildMonthlyTimeline = (
    repos: GithubMetricsHistory['repos'],
    weeklyTotals: GithubMetricsWeeklyTotals[],
    nowMs: number,
    retentionDays: number,
): GithubMetricsTimelineMonth[] => {
    const cutoffMs = retentionDays ? nowMs - retentionDays * DAY_MS : 0;
    const monthStars = new Map<string, number>();
    repos.forEach((repo) => {
        const monthLatest = new Map<string, {date: string; stars: number}>();
        (repo.snapshots ?? []).forEach((snapshot) => {
            const snapshotMs = Date.parse(snapshot.date);
            if (cutoffMs && snapshotMs < cutoffMs) return;
            const monthKey = snapshot.date.slice(0, 7);
            const existing = monthLatest.get(monthKey);
            if (!existing || snapshot.date > existing.date) {
                monthLatest.set(monthKey, {
                    date: snapshot.date,
                    stars: snapshot.stars,
                });
            }
        });
        monthLatest.forEach((value, month) => {
            monthStars.set(month, (monthStars.get(month) ?? 0) + value.stars);
        });
    });

    const monthCommits = new Map<string, number>();
    weeklyTotals.forEach((week) => {
        const monthKey = new Date(week.week * 1000).toISOString().slice(0, 7);
        monthCommits.set(monthKey, (monthCommits.get(monthKey) ?? 0) + week.commits);
    });

    const months = Array.from(
        new Set([...monthStars.keys(), ...monthCommits.keys()]),
    ).sort();
    if (months.length === 0) return [];
    if (!retentionDays) {
        return months.map((month) => ({
            month,
            stars: monthStars.get(month) ?? 0,
            commits: monthCommits.get(month) ?? 0,
        }));
    }
    const retentionMonths = Math.max(1, Math.ceil(retentionDays / 30));
    const maxMonths = Math.min(retentionMonths, 24);
    const visibleMonths = months.slice(-maxMonths);
    return visibleMonths.map((month) => ({
        month,
        stars: monthStars.get(month) ?? 0,
        commits: monthCommits.get(month) ?? 0,
    }));
};

const getContributionDays = (
    history: GithubMetricsHistory | null,
    retentionDays: number,
): GithubMetricsContributionDay[] => {
    const days = history?.contributions?.days ?? [];
    if (!retentionDays) return days;
    return days.slice(-retentionDays);
};

const buildUpdateState = async (
    store: MetricsStore,
    history: GithubMetricsHistory | null,
    now: number,
): Promise<GithubMetricsUpdateState | null> => {
    const lock = await store.getLock();
    const lockStartedAt = lock?.startedAt ? Date.parse(lock.startedAt) : 0;
    const lockActive = Boolean(
        lock && Number.isFinite(lockStartedAt) && now - lockStartedAt < LOCK_STALE_MS,
    );
    const progress = history?.progress;
    const totalRepos = progress?.totalRepos ?? history?.repos?.length ?? 0;
    const processedRepos = progress?.processedRepos ?? history?.repos?.length ?? 0;
    const inProgress =
        lockActive ||
        (progress ? Boolean(!progress.finishedAt && processedRepos < totalRepos) : false);

    if (!lockActive && !progress) {
        return null;
    }

    return {
        totalRepos,
        processedRepos,
        startedAt: progress?.startedAt ?? null,
        updatedAt: progress?.updatedAt ?? history?.generatedAt ?? null,
        finishedAt: progress?.finishedAt ?? null,
        inProgress,
        lockDetected: lockActive,
    };
};

const buildPayloadFromHistory = (
    history: GithubMetricsHistory | null,
    update: GithubMetricsUpdateState | null,
    now: number,
): GithubMetricsResponse => {
    if (!history) {
        return {
            fetchedAt: new Date().toISOString(),
            historyUpdatedAt: null,
            summary: {
                repos: 0,
                activeRepos: 0,
                stars: 0,
                forks: 0,
                commits: emptyTotals(),
                additions: emptyTotals(),
                deletions: emptyTotals(),
            },
            repos: [],
            timeline: {months: [], weeks: [], days: []},
            update,
            error: 'GitHub metrics history is unavailable.',
        };
    }

    const visibleRepos = history.repos.filter((repo) => repo.visibility === 'public');
    const repoSummaries = visibleRepos.map((repo) => buildRepoSummary(repo, now));
    const summary = buildSummary(repoSummaries, now);
    const retentionDays = parseRetentionDays();
    const weeklyTotals = buildWeeklyTotals(visibleRepos, now, retentionDays);
    const monthlyTimeline = buildMonthlyTimeline(
        visibleRepos,
        weeklyTotals,
        now,
        retentionDays,
    );
    const contributionDays = getContributionDays(history, retentionDays);

    return {
        fetchedAt: new Date().toISOString(),
        historyUpdatedAt: history.generatedAt,
        summary,
        repos: repoSummaries,
        timeline: {
            months: monthlyTimeline,
            weeks: weeklyTotals,
            days: contributionDays,
        },
        update,
    };
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GithubMetricsResponse>,
) {
    try {
        const now = Date.now();
        const forceRefresh = req.query.refresh === '1';
        const cacheEntry = getCacheEntry<GithubMetricsResponse>(CACHE_KEY);

        const store = await getMetricsStore();
        const history = await store.getHistory();
        const update = await buildUpdateState(store, history, now);

        if (!forceRefresh && cacheEntry && now < cacheEntry.expiresAt && !update?.inProgress) {
            const historyUpdatedAt = history?.generatedAt
                ? Date.parse(history.generatedAt)
                : 0;
            const cacheUpdatedAt = cacheEntry.data.historyUpdatedAt
                ? Date.parse(cacheEntry.data.historyUpdatedAt)
                : 0;
            if (historyUpdatedAt <= cacheUpdatedAt) {
                res.setHeader(
                    'Cache-Control',
                    CACHE_CONTROL_HEADER,
                );
                return res.status(200).json({
                    ...cacheEntry.data,
                    update: update ?? cacheEntry.data.update ?? null,
                });
            }
        }

        if (forceRefresh) {
            const refresh = checkManualRefresh(CACHE_KEY, MANUAL_REFRESH_COOLDOWN_MS);
            if (!refresh.allowed) {
                const refreshLockedUntil = new Date(refresh.nextAllowedAt).toISOString();
                if (cacheEntry) {
                    return res.status(200).json({
                        ...cacheEntry.data,
                        refreshLockedUntil,
                    });
                }
                return res
                    .status(200)
                    .json({...buildPayloadFromHistory(history, update, now), refreshLockedUntil});
            }
        }

        const inflight = getInFlight<GithubMetricsResponse>(CACHE_KEY);
        if (inflight) {
            const payload = await inflight;
            return res.status(200).json(payload);
        }

        const promise = Promise.resolve(buildPayloadFromHistory(history, update, now))
            .then((payload) => {
                setCacheEntry(CACHE_KEY, payload, CACHE_TTL_MS, STALE_TTL_MS);
                return payload;
            })
            .finally(() => {
                clearInFlight(CACHE_KEY);
            });

        setInFlight(CACHE_KEY, promise);
        const payload = await promise;
        res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
        return res.status(200).json(payload);
    } catch (error) {
        const cacheEntry = getCacheEntry<GithubMetricsResponse>(CACHE_KEY);
        if (cacheEntry && Date.now() < cacheEntry.staleUntil) {
            res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
            return res.status(200).json(cacheEntry.data);
        }
        const store = await getMetricsStore();
        const update = await buildUpdateState(store, null, Date.now());
        return res
            .status(200)
            .json({...buildPayloadFromHistory(null, update, Date.now()), error: `GitHub metrics error: ${error}`});
    }
}
