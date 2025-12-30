import type {NextApiRequest, NextApiResponse} from 'next';
import type {GithubMetricsHistory} from '../../lib/githubMetricsTypes';
import {getMetricsStore} from '../../lib/metricsStore';
import type {MetricsStore} from '../../lib/metricsStore';
import {
    checkManualRefresh,
    clearInFlight,
    getInFlight,
    setInFlight,
} from '../../lib/cacheStore';

type RepoRefreshResponse = {
    ok: boolean;
    message?: string;
    updatedAt?: string | null;
    refreshLockedUntil?: string | null;
    inProgress?: boolean;
};

const LOCK_STALE_MS = 4 * 60 * 60 * 1000;
const LOCAL_COOLDOWN_MS = 60 * 1000;
const PROD_COOLDOWN_MS = 5 * 60 * 1000;

const requestJson = async (url: string, headers: Record<string, string>) => {
    const response = await fetch(url, {headers});
    const body = await response.text();
    if (!response.ok) {
        throw new Error(`GitHub request failed ${response.status}: ${body}`);
    }
    if (!body) return null;
    return JSON.parse(body);
};

const fetchContributorStats = async (fullName: string, headers: Record<string, string>) => {
    const url = `https://api.github.com/repos/${fullName}/stats/contributors`;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(url, {headers});
        if (response.status === 202) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
        }
        const body = await response.text();
        if (!response.ok) {
            throw new Error(`GitHub stats failed ${response.status}: ${body}`);
        }
        if (!body) return null;
        return JSON.parse(body);
    }
    return null;
};

const isLockActive = async (store: MetricsStore) => {
    const lock = await store.getLock();
    if (!lock?.startedAt) return false;
    const startedAt = Date.parse(lock.startedAt);
    if (Number.isNaN(startedAt)) return false;
    return Date.now() - startedAt < LOCK_STALE_MS;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const trimSnapshots = (
    snapshots: GithubMetricsHistory['repos'][number]['snapshots'],
    cutoffMs: number,
) => snapshots.filter((snapshot) => new Date(snapshot.date).getTime() >= cutoffMs);
const trimWeeks = (
    weeks: GithubMetricsHistory['repos'][number]['weeks'],
    cutoffMs: number,
) => weeks.filter((week) => week.week * 1000 + WEEK_MS >= cutoffMs);

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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<RepoRefreshResponse>,
) {
    if (req.method && !['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ok: false, message: 'Method not allowed.'});
    }

    const repoParam = Array.isArray(req.query.repo) ? req.query.repo[0] : req.query.repo;
    if (!repoParam) {
        return res.status(400).json({ok: false, message: 'Missing repo name.'});
    }

    if (!process.env.GITHUB_TOKEN) {
        return res.status(200).json({ok: false, message: 'Missing GITHUB_TOKEN.'});
    }

    const store = await getMetricsStore();
    if (await isLockActive(store)) {
        return res.status(200).json({
            ok: false,
            message: 'Metrics update already running.',
            inProgress: true,
        });
    }

    const inflightKey = `github-metrics-repo:${repoParam.toLowerCase()}`;
    const inflight = getInFlight<RepoRefreshResponse>(inflightKey);
    if (inflight) {
        const payload = await inflight;
        return res.status(200).json(payload);
    }

    const promise = (async () => {
        const history = await store.getHistory();
        if (!history) {
            return {ok: false, message: 'Metrics history not found.'};
        }
        const repoIndex = history.repos.findIndex(
            (repo) => repo.fullName.toLowerCase() === repoParam.toLowerCase(),
        );
        if (repoIndex === -1) {
            return {ok: false, message: 'Repository not tracked.'};
        }

        const repoEntry = history.repos[repoIndex];
        if (repoEntry.visibility !== 'public') {
            return {ok: false, message: 'Repository is not public.'};
        }
        const cooldownMs =
            process.env.NODE_ENV === 'production' ? PROD_COOLDOWN_MS : LOCAL_COOLDOWN_MS;
        const lastUpdated = repoEntry.updatedAt
            ? Date.parse(repoEntry.updatedAt)
            : 0;
        if (lastUpdated && Date.now() - lastUpdated < cooldownMs) {
            return {
                ok: false,
                refreshLockedUntil: new Date(lastUpdated + cooldownMs).toISOString(),
            };
        }

        const refresh = checkManualRefresh(inflightKey, cooldownMs);
        if (!refresh.allowed) {
            return {
                ok: false,
                refreshLockedUntil: new Date(refresh.nextAllowedAt).toISOString(),
            };
        }

        const headers: Record<string, string> = {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        };

        let repoData = repoEntry;
        try {
            const freshRepo = await requestJson(
                `https://api.github.com/repos/${repoEntry.fullName}`,
                headers,
            );
            if (freshRepo) {
                if (freshRepo.private) {
                    return {ok: false, message: 'Repository is private.'};
                }
                repoData = {
                    ...repoEntry,
                    name: freshRepo.name ?? repoEntry.name,
                    fullName: freshRepo.full_name ?? repoEntry.fullName,
                    description: freshRepo.description ?? repoEntry.description,
                    htmlUrl: freshRepo.html_url ?? repoEntry.htmlUrl,
                    stars: freshRepo.stargazers_count ?? repoEntry.stars,
                    forks: freshRepo.forks_count ?? repoEntry.forks,
                    pushedAt: freshRepo.pushed_at ?? repoEntry.pushedAt,
                    visibility: freshRepo.private ? 'private' : 'public',
                };
            }
        } catch (error) {
            return {ok: false, message: `GitHub repo fetch failed: ${error}`};
        }

        let weeks = repoEntry.weeks;
        try {
            const stats = await fetchContributorStats(repoEntry.fullName, headers);
            const contributor = Array.isArray(stats)
                ? stats.find(
                      (entry: any) =>
                          entry.author && entry.author.login?.toLowerCase() === history.user.toLowerCase(),
                  )
                : null;
            if (contributor && Array.isArray(contributor.weeks)) {
                weeks = contributor.weeks.map((week: any) => ({
                    week: week.w,
                    commits: week.c,
                    additions: week.a,
                    deletions: week.d,
                }));
            }
        } catch (error) {
            return {ok: false, message: `GitHub stats failed: ${error}`};
        }

        const snapshotDate = new Date().toISOString().slice(0, 10);
        const retentionDays = parseRetentionDays();
        const snapshotCutoff = retentionDays
            ? Date.now() - retentionDays * 24 * 60 * 60 * 1000
            : 0;
        const trimmedSnapshots = retentionDays
            ? trimSnapshots(repoEntry.snapshots ?? [], snapshotCutoff).filter(
                  (snapshot) => snapshot.date !== snapshotDate,
              )
            : (repoEntry.snapshots ?? []).filter(
                  (snapshot) => snapshot.date !== snapshotDate,
              );
        const snapshots = [
            ...trimmedSnapshots,
            {
                date: snapshotDate,
                stars: repoData.stars,
                forks: repoData.forks,
                pushedAt: repoData.pushedAt ?? null,
            },
        ];
        const trimmedWeeks = retentionDays
            ? trimWeeks(weeks, snapshotCutoff)
            : weeks;

        const updatedAt = new Date().toISOString();
        history.repos[repoIndex] = {
            ...repoData,
            weeks: trimmedWeeks,
            snapshots,
            updatedAt,
        };
        history.generatedAt = updatedAt;
        if (history.progress) {
            history.progress.updatedAt = updatedAt;
        }
        await store.saveHistory(history);

        return {ok: true, updatedAt};
    })()
        .catch((error) => ({ok: false, message: `Repo refresh error: ${error}`}))
        .finally(() => clearInFlight(inflightKey));

    setInFlight(inflightKey, promise);
    const payload = await promise;
    return res.status(200).json(payload);
}
