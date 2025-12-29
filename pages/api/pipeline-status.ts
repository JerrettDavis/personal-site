import type {NextApiRequest, NextApiResponse} from 'next';
import {getActiveRepos} from '../../lib/github';
import {GITHUB_USERNAME, PROJECT_ACTIVITY_DAYS} from '../../data/projects';
import type {GitHubRepo} from '../../lib/github';
import type {
    PipelineRepoStatus,
    PipelineState,
    PipelineStatusResponse,
    PipelineSummary,
} from '../../lib/pipelines';
import {resolveCacheConfig, resolveCacheMs} from '../../lib/cacheConfig';
import {
    checkManualRefresh,
    clearInFlight,
    getCacheEntry,
    getInFlight,
    getRateLimit,
    setCacheEntry,
    setInFlight,
    setRateLimit,
} from '../../lib/cacheStore';

type WorkflowRun = {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string;
    created_at?: string;
    updated_at: string;
    event?: string;
    head_branch?: string;
};

type WorkflowRunsResponse = {
    total_count: number;
    workflow_runs: WorkflowRun[];
};

const CACHE_KEY = 'pipeline-status';
const PROVIDER = 'github';
const {ttlMs: DEFAULT_CACHE_TTL_MS, staleMs: STALE_TTL_MS} = resolveCacheConfig(
    'PIPELINE_CACHE_TTL_MS',
    'PIPELINE_CACHE_STALE_MS',
);
const ACTIVE_CACHE_TTL_MS = resolveCacheMs(
    'PIPELINE_ACTIVE_CACHE_TTL_MS',
    60 * 1000,
);
const buildCacheControl = (ttlMs: number) =>
    `public, s-maxage=${Math.ceil(ttlMs / 1000)}, stale-while-revalidate=${Math.ceil(
        STALE_TTL_MS / 1000,
    )}`;
const MANUAL_REFRESH_COOLDOWN_MS = 60 * 1000;

const buildHeaders = () => {
    const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
    };
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return headers;
};

const mapRunToState = (run: WorkflowRun): PipelineState => {
    if (run.status !== 'completed') return 'running';
    if (run.conclusion === 'success') return 'passing';
    return 'failing';
};

const parseRateLimit = (headers: Headers) => {
    const remaining = Number(headers.get('x-ratelimit-remaining') ?? '1');
    if (Number.isNaN(remaining) || remaining > 0) return null;
    const reset = Number(headers.get('x-ratelimit-reset') ?? '0');
    if (!Number.isNaN(reset) && reset > 0) {
        return reset * 1000;
    }
    return Date.now() + 5 * 60 * 1000;
};

const RUNS_PER_REPO = 5;

const fetchRepoStatus = async (
    repo: GitHubRepo,
    headers: Record<string, string>,
    rateLimitState: {until: number},
): Promise<PipelineRepoStatus> => {
    if (rateLimitState.until > Date.now()) {
        return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            htmlUrl: repo.html_url,
            status: 'unknown',
            runName: null,
            runUrl: null,
            runStatus: null,
            runConclusion: null,
            updatedAt: null,
            note: 'Rate limited. Skipping additional requests.',
            runs: [],
        };
    }
    const url = `https://api.github.com/repos/${repo.full_name}/actions/runs?per_page=${RUNS_PER_REPO}`;
    try {
        const response = await fetch(url, {headers});
        const limitReset = parseRateLimit(response.headers);
        if (limitReset) {
            rateLimitState.until = limitReset;
            setRateLimit(PROVIDER, limitReset, 'workflow-runs');
        }
        if (!response.ok) {
            return {
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                status: 'unknown',
                runName: null,
                runUrl: null,
                runStatus: null,
                runConclusion: null,
                updatedAt: null,
                note: response.status === 403 && limitReset
                    ? 'GitHub rate limit reached.'
                    : `GitHub Actions fetch failed (${response.status}).`,
            };
        }
        const data = (await response.json()) as WorkflowRunsResponse;
        const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
        const run = runs[0];
        if (!run) {
            return {
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                htmlUrl: repo.html_url,
                status: 'unknown',
                runName: null,
                runUrl: null,
                runStatus: null,
                runConclusion: null,
                updatedAt: null,
                note: 'No workflow runs found.',
            };
        }
        const runSummaries = [];
        const seenKeys = new Set<string>();
        for (const item of runs) {
            const name = item.name ?? 'Workflow run';
            const dedupeKey = item.name ? `name:${item.name}` : `id:${item.id}`;
            if (seenKeys.has(dedupeKey)) continue;
            seenKeys.add(dedupeKey);
            runSummaries.push({
                id: item.id,
                name,
                status: item.status ?? null,
                conclusion: item.conclusion ?? null,
                url: item.html_url ?? null,
                updatedAt: item.updated_at ?? null,
                createdAt: item.created_at ?? null,
                branch: item.head_branch ?? null,
                event: item.event ?? null,
            });
            if (runSummaries.length >= RUNS_PER_REPO) break;
        }
        return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            htmlUrl: repo.html_url,
            status: mapRunToState(run),
            runName: run.name ?? null,
            runUrl: run.html_url ?? null,
            runStatus: run.status ?? null,
            runConclusion: run.conclusion ?? null,
            updatedAt: run.updated_at ?? null,
            runs: runSummaries,
        };
    } catch (error) {
        return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            htmlUrl: repo.html_url,
            status: 'unknown',
            runName: null,
            runUrl: null,
            runStatus: null,
            runConclusion: null,
            updatedAt: null,
            note: `GitHub Actions error: ${error}`,
        };
    }
};

const mapWithLimit = async <T, R>(
    items: T[],
    limit: number,
    mapper: (item: T) => Promise<R>,
): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let index = 0;

    const workers = Array.from({length: Math.min(limit, items.length)}).map(async () => {
        while (index < items.length) {
            const current = index;
            index += 1;
            results[current] = await mapper(items[current]);
        }
    });

    await Promise.all(workers);
    return results;
};

const summarize = (repos: PipelineRepoStatus[]): PipelineSummary => {
    const summary = {
        running: 0,
        passing: 0,
        failing: 0,
        unknown: 0,
        total: 0,
    };
    repos.forEach((repo) => {
        if (repo.status === 'running') summary.running += 1;
        else if (repo.status === 'passing') summary.passing += 1;
        else if (repo.status === 'failing') summary.failing += 1;
        else summary.unknown += 1;
    });
    summary.total = summary.running + summary.passing + summary.failing;
    return summary;
};

const buildStatusPayload = async (): Promise<PipelineStatusResponse> => {
    const rateLimitState = {until: 0};
    const {repos, error} = await getActiveRepos({
        username: GITHUB_USERNAME,
        lookbackDays: PROJECT_ACTIVITY_DAYS,
        onRateLimit: (until) => {
            rateLimitState.until = Math.max(rateLimitState.until, until);
            setRateLimit(PROVIDER, until, 'repos');
        },
    });

    if (error) {
        return {
            summary: {running: 0, passing: 0, failing: 0, unknown: 0, total: 0},
            repos: [],
            fetchedAt: new Date().toISOString(),
            error,
        };
    }

    const headers = buildHeaders();
    const repoStatuses = await mapWithLimit(repos, 4, (repo) => fetchRepoStatus(repo, headers, rateLimitState));
    const summary = summarize(repoStatuses);
    const rateLimitedUntil = getRateLimit(PROVIDER)?.until ?? null;

    return {
        summary,
        repos: repoStatuses,
        fetchedAt: new Date().toISOString(),
        rateLimitedUntil: rateLimitedUntil ? new Date(rateLimitedUntil).toISOString() : null,
    };
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<PipelineStatusResponse>,
) {
    try {
        const now = Date.now();
        const forceRefresh = req.query.refresh === '1';
        const cacheEntry = getCacheEntry<PipelineStatusResponse>(CACHE_KEY);
        const rateLimit = getRateLimit(PROVIDER);

        if (rateLimit) {
            if (cacheEntry && now < cacheEntry.staleUntil) {
                const ttlMs = cacheEntry.data.summary?.running > 0
                    ? ACTIVE_CACHE_TTL_MS
                    : DEFAULT_CACHE_TTL_MS;
                res.setHeader('Cache-Control', buildCacheControl(ttlMs));
                res.setHeader('Retry-After', Math.ceil((rateLimit.until - now) / 1000));
                return res.status(200).json({
                    ...cacheEntry.data,
                    rateLimitedUntil: new Date(rateLimit.until).toISOString(),
                });
            }
            res.setHeader('Retry-After', Math.ceil((rateLimit.until - now) / 1000));
            return res.status(200).json({
                summary: {running: 0, passing: 0, failing: 0, unknown: 0, total: 0},
                repos: [],
                fetchedAt: new Date().toISOString(),
                error: 'GitHub rate limit reached.',
                rateLimitedUntil: new Date(rateLimit.until).toISOString(),
            });
        }

        if (!forceRefresh && cacheEntry && now < cacheEntry.expiresAt) {
            const ttlMs = cacheEntry.data.summary?.running > 0
                ? ACTIVE_CACHE_TTL_MS
                : DEFAULT_CACHE_TTL_MS;
            res.setHeader('Cache-Control', buildCacheControl(ttlMs));
            return res.status(200).json(cacheEntry.data);
        }

        if (forceRefresh) {
            const refresh = checkManualRefresh(CACHE_KEY, MANUAL_REFRESH_COOLDOWN_MS);
            if (!refresh.allowed) {
                const refreshLockedUntil = new Date(refresh.nextAllowedAt).toISOString();
                if (cacheEntry) {
                    const ttlMs = cacheEntry.data.summary?.running > 0
                        ? ACTIVE_CACHE_TTL_MS
                        : DEFAULT_CACHE_TTL_MS;
                    res.setHeader('Cache-Control', buildCacheControl(ttlMs));
                    return res.status(200).json({
                        ...cacheEntry.data,
                        refreshLockedUntil,
                    });
                }
                return res.status(200).json({
                    summary: {running: 0, passing: 0, failing: 0, unknown: 0, total: 0},
                    repos: [],
                    fetchedAt: new Date().toISOString(),
                    refreshLockedUntil,
                });
            }
        }

        const inflight = getInFlight<PipelineStatusResponse>(CACHE_KEY);
        if (inflight) {
            const payload = await inflight;
            return res.status(200).json(payload);
        }

        const promise = buildStatusPayload()
            .then((payload) => {
                const ttl = payload.summary.running > 0 ? ACTIVE_CACHE_TTL_MS : DEFAULT_CACHE_TTL_MS;
                setCacheEntry(CACHE_KEY, payload, ttl, STALE_TTL_MS);
                return payload;
            })
            .finally(() => {
                clearInFlight(CACHE_KEY);
            });
        setInFlight(CACHE_KEY, promise);
        const payload = await promise;
        const ttlMs = payload.summary.running > 0
            ? ACTIVE_CACHE_TTL_MS
            : DEFAULT_CACHE_TTL_MS;
        res.setHeader('Cache-Control', buildCacheControl(ttlMs));
        return res.status(200).json(payload);
    } catch (error) {
        const cacheEntry = getCacheEntry<PipelineStatusResponse>(CACHE_KEY);
        if (cacheEntry && Date.now() < cacheEntry.staleUntil) {
            const ttlMs = cacheEntry.data.summary?.running > 0
                ? ACTIVE_CACHE_TTL_MS
                : DEFAULT_CACHE_TTL_MS;
            res.setHeader('Cache-Control', buildCacheControl(ttlMs));
            return res.status(200).json(cacheEntry.data);
        }
        return res.status(200).json({
            summary: {running: 0, passing: 0, failing: 0, unknown: 0, total: 0},
            repos: [],
            fetchedAt: new Date().toISOString(),
            error: `Pipeline status error: ${error}`,
        });
    }
}
