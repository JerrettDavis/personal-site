import type {NextApiRequest, NextApiResponse} from 'next';
import fs from 'fs/promises';
import path from 'path';
import type {
    GithubMetricsHistory,
    GithubMetricsResponse,
    GithubMetricsUpdateState,
    GithubRepoMetricSummary,
    GithubMetricsSummary,
    GithubWeekMetrics,
    RangeTotals,
} from '../../lib/githubMetricsTypes';
import {
    checkManualRefresh,
    clearInFlight,
    getCacheEntry,
    getInFlight,
    setCacheEntry,
    setInFlight,
} from '../../lib/cacheStore';

const CACHE_KEY = 'github-metrics';
const CACHE_TTL_MS = 15 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;
const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;
const TREND_WEEKS = 12;
const METRICS_PATH = path.join(process.cwd(), 'data', 'githubMetricsHistory.json');
const LOCK_PATH = path.join(process.cwd(), 'data', '.githubMetrics.lock');
const LOCK_STALE_MS = 4 * 60 * 60 * 1000;

const emptyTotals = (): RangeTotals => ({week: 0, month: 0, year: 0});

const isWithinRange = (weekSeconds: number, cutoffMs: number) =>
    weekSeconds * 1000 >= cutoffMs;

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

const loadHistory = async (): Promise<GithubMetricsHistory | null> => {
    try {
        const raw = await fs.readFile(METRICS_PATH, 'utf8');
        const parsed = JSON.parse(raw) as GithubMetricsHistory;
        if (!parsed || !Array.isArray(parsed.repos)) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const loadLock = async () => {
    try {
        const raw = await fs.readFile(LOCK_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        const startedAt = new Date(parsed.startedAt).getTime();
        if (Number.isNaN(startedAt)) return null;
        return {startedAt};
    } catch {
        return null;
    }
};

const buildUpdateState = async (
    history: GithubMetricsHistory | null,
    now: number,
): Promise<GithubMetricsUpdateState | null> => {
    const lock = await loadLock();
    const lockActive = Boolean(lock && now - lock.startedAt < LOCK_STALE_MS);
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
            update,
            error: 'GitHub metrics history is unavailable.',
        };
    }

    const repoSummaries = history.repos.map((repo) => buildRepoSummary(repo, now));
    const summary = buildSummary(repoSummaries, now);

    return {
        fetchedAt: new Date().toISOString(),
        historyUpdatedAt: history.generatedAt,
        summary,
        repos: repoSummaries,
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

        const history = await loadHistory();
        const update = await buildUpdateState(history, now);

        if (!forceRefresh && cacheEntry && now < cacheEntry.expiresAt && !update?.inProgress) {
            const cacheTimestamp = cacheEntry.data.historyUpdatedAt
                ? Date.parse(cacheEntry.data.historyUpdatedAt)
                : 0;
            if (Number.isFinite(cacheTimestamp)) {
                const stat = await fs.stat(METRICS_PATH).catch(() => null);
                if (stat && stat.mtimeMs > cacheTimestamp + 1000) {
                    // History updated; bypass cache and rebuild.
                } else {
                    res.setHeader(
                        'Cache-Control',
                        'public, s-maxage=300, stale-while-revalidate=600',
                    );
                    return res.status(200).json({
                        ...cacheEntry.data,
                        update: update ?? cacheEntry.data.update ?? null,
                    });
                }
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
        return res.status(200).json(payload);
    } catch (error) {
        const cacheEntry = getCacheEntry<GithubMetricsResponse>(CACHE_KEY);
        if (cacheEntry && Date.now() < cacheEntry.staleUntil) {
            return res.status(200).json(cacheEntry.data);
        }
        const update = await buildUpdateState(null, Date.now());
        return res
            .status(200)
            .json({...buildPayloadFromHistory(null, update, Date.now()), error: `GitHub metrics error: ${error}`});
    }
}
