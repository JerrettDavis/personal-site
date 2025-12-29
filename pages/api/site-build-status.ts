import type {NextApiRequest, NextApiResponse} from 'next';
import type {
    BuildDeployment,
    BuildStatus,
    SiteBuildStatusResponse,
} from '../../lib/siteBuild';
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

type VercelDeployment = {
    id?: string;
    uid?: string;
    name: string;
    url: string;
    created: number;
    state?: string;
    readyState?: string;
    target?: string;
    meta?: Record<string, string>;
    alias?: string[];
    gitSource?: {
        type?: string;
        ref?: string;
        sha?: string;
        prId?: number;
        repo?: string;
        org?: string;
    };
};

type VercelDeploymentsResponse = {
    deployments: VercelDeployment[];
};

const VERCEL_API_BASE = 'https://api.vercel.com';
const CACHE_KEY = 'site-build-status';
const PROVIDER = 'vercel';
const {ttlMs: DEFAULT_CACHE_TTL_MS, staleMs: STALE_TTL_MS} = resolveCacheConfig(
    'SITE_BUILD_CACHE_TTL_MS',
    'SITE_BUILD_CACHE_STALE_MS',
);
const ACTIVE_CACHE_TTL_MS = resolveCacheMs(
    'SITE_BUILD_ACTIVE_CACHE_TTL_MS',
    25 * 1000,
);
const buildCacheControl = (ttlMs: number, staleMs = STALE_TTL_MS) =>
    `public, s-maxage=${Math.ceil(ttlMs / 1000)}, stale-while-revalidate=${Math.ceil(
        staleMs / 1000,
    )}`;
const MANUAL_REFRESH_COOLDOWN_MS = 45 * 1000;

const getEnv = () => ({
    token: process.env.VERCEL_TOKEN,
    projectId: process.env.VERCEL_PROJECT_ID,
    teamId: process.env.VERCEL_TEAM_ID,
});

const getMetaValue = (meta: Record<string, string> | undefined, keys: string[]) => {
    if (!meta) return null;
    for (const key of keys) {
        const value = meta[key];
        if (value && value.trim().length > 0) return value;
    }
    return null;
};

const toStatus = (state?: string): BuildStatus => {
    const normalized = (state ?? 'unknown').toUpperCase();
    if (['BUILDING', 'INITIALIZING'].includes(normalized)) return 'building';
    if (['QUEUED'].includes(normalized)) return 'queued';
    if (['READY'].includes(normalized)) return 'ready';
    if (['CANCELED'].includes(normalized)) return 'canceled';
    if (['ERROR', 'FAILED'].includes(normalized)) return 'error';
    return 'unknown';
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

const toDeployment = (deployment: VercelDeployment): BuildDeployment => {
    const meta = deployment.meta;
    const id = deployment.uid ?? deployment.id ?? deployment.url;
    const readyState = deployment.readyState ?? deployment.state ?? 'UNKNOWN';
    const status = toStatus(readyState);
    const branch = deployment.gitSource?.ref
        ?? getMetaValue(meta, ['githubCommitRef', 'gitBranch', 'branch']);
    const commitMessage = getMetaValue(meta, ['githubCommitMessage', 'gitCommitMessage']);
    const commitSha = deployment.gitSource?.sha ?? getMetaValue(meta, ['githubCommitSha', 'gitCommitSha']);
    const author = getMetaValue(meta, ['githubCommitAuthorName', 'githubCommitAuthorLogin']);
    const prIdRaw = deployment.gitSource?.prId
        ?? getMetaValue(meta, ['githubPrId', 'githubPullRequestId']);
    const prId = prIdRaw ? Number(prIdRaw) : null;
    const org = deployment.gitSource?.org ?? getMetaValue(meta, ['githubOrg', 'githubCommitOrg']);
    const repo = deployment.gitSource?.repo ?? getMetaValue(meta, ['githubRepo', 'githubCommitRepo']);
    const prUrl = prId && org && repo
        ? `https://github.com/${org}/${repo}/pull/${prId}`
        : null;
    const rawUrl = deployment.url ?? deployment.alias?.[0] ?? '';
    const url = rawUrl
        ? rawUrl.startsWith('http')
            ? rawUrl
            : `https://${rawUrl}`
        : '';
    const createdAt = new Date(deployment.created).toISOString();

    return {
        id,
        url,
        readyState,
        status,
        createdAt,
        branch: branch ?? null,
        commitMessage,
        commitSha,
        author,
        prId,
        prUrl,
    };
};

const dedupePreviews = (previews: BuildDeployment[]) => {
    const map = new Map<string, BuildDeployment>();
    previews.forEach((preview) => {
        const key = preview.prId
            ? `pr-${preview.prId}`
            : preview.branch
                ? `branch-${preview.branch}`
                : preview.id;
        const existing = map.get(key);
        if (!existing || Date.parse(preview.createdAt) > Date.parse(existing.createdAt)) {
            map.set(key, preview);
        }
    });
    return Array.from(map.values());
};

const buildSummary = (deployments: BuildDeployment[]) => {
    return deployments.reduce(
        (summary, deployment) => {
            if (deployment.status === 'building') summary.building += 1;
            if (deployment.status === 'queued') summary.queued += 1;
            if (deployment.status === 'error') summary.failed += 1;
            summary.inProgress = summary.building + summary.queued;
            return summary;
        },
        {
            building: 0,
            queued: 0,
            failed: 0,
            inProgress: 0,
        },
    );
};

const fetchDeployments = async (
    target: 'preview' | 'production',
    token: string,
    projectId: string,
    teamId?: string,
) => {
    const url = new URL(`${VERCEL_API_BASE}/v6/deployments`);
    url.searchParams.set('projectId', projectId);
    url.searchParams.set('target', target);
    url.searchParams.set('limit', '40');
    if (teamId) url.searchParams.set('teamId', teamId);

    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const limitReset = parseRateLimit(response.headers);
    if (limitReset) {
        setRateLimit(PROVIDER, limitReset, 'deployments');
    }
    if (!response.ok) {
        throw new Error(`Vercel deployments fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as VercelDeploymentsResponse;
    return data.deployments ?? [];
};

const buildStatusPayload = async (): Promise<SiteBuildStatusResponse> => {
    const {token, projectId, teamId} = getEnv();
    if (!token || !projectId) {
        return {
            summary: {building: 0, queued: 0, failed: 0, inProgress: 0},
            production: null,
            previews: [],
            fetchedAt: new Date().toISOString(),
            error: 'Missing VERCEL_TOKEN or VERCEL_PROJECT_ID.',
        };
    }

    const [previewDeployments, productionDeployments] = await Promise.all([
        fetchDeployments('preview', token, projectId, teamId),
        fetchDeployments('production', token, projectId, teamId),
    ]);

    const previews = dedupePreviews(
        previewDeployments
            .filter((deployment) => deployment.state?.toUpperCase() !== 'CANCELED')
            .map(toDeployment),
    ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    const production = productionDeployments.length > 0
        ? toDeployment(productionDeployments[0])
        : null;

    const summary = buildSummary([
        ...previews,
        ...(production ? [production] : []),
    ]);

    const rateLimitedUntil = getRateLimit(PROVIDER)?.until ?? null;
    return {
        summary,
        production,
        previews,
        fetchedAt: new Date().toISOString(),
        rateLimitedUntil: rateLimitedUntil ? new Date(rateLimitedUntil).toISOString() : null,
    };
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SiteBuildStatusResponse>,
) {
    try {
        const now = Date.now();
        const forceRefresh = req.query.refresh === '1';
        const cacheEntry = getCacheEntry<SiteBuildStatusResponse>(CACHE_KEY);
        const rateLimit = getRateLimit(PROVIDER);

        if (rateLimit) {
            if (cacheEntry && now < cacheEntry.staleUntil) {
                const ttlMs = cacheEntry.data.summary?.inProgress > 0
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
                summary: {building: 0, queued: 0, failed: 0, inProgress: 0},
                production: null,
                previews: [],
                fetchedAt: new Date().toISOString(),
                error: 'Vercel rate limit reached.',
                rateLimitedUntil: new Date(rateLimit.until).toISOString(),
            });
        }

        if (!forceRefresh && cacheEntry && now < cacheEntry.expiresAt) {
            const ttlMs = cacheEntry.data.summary?.inProgress > 0
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
                    const ttlMs = cacheEntry.data.summary?.inProgress > 0
                        ? ACTIVE_CACHE_TTL_MS
                        : DEFAULT_CACHE_TTL_MS;
                    res.setHeader('Cache-Control', buildCacheControl(ttlMs));
                    return res.status(200).json({
                        ...cacheEntry.data,
                        refreshLockedUntil,
                    });
                }
                return res.status(200).json({
                    summary: {building: 0, queued: 0, failed: 0, inProgress: 0},
                    production: null,
                    previews: [],
                    fetchedAt: new Date().toISOString(),
                    refreshLockedUntil,
                });
            }
        }

        const inflight = getInFlight<SiteBuildStatusResponse>(CACHE_KEY);
        if (inflight) {
            const payload = await inflight;
            return res.status(200).json(payload);
        }

        const promise = buildStatusPayload()
            .then((data) => {
                const ttl = data.summary.inProgress > 0 ? ACTIVE_CACHE_TTL_MS : DEFAULT_CACHE_TTL_MS;
                setCacheEntry(CACHE_KEY, data, ttl, STALE_TTL_MS);
                return data;
            })
            .finally(() => {
                clearInFlight(CACHE_KEY);
            });
        setInFlight(CACHE_KEY, promise);
        const payload = await promise;
        const ttlMs = payload.summary.inProgress > 0
            ? ACTIVE_CACHE_TTL_MS
            : DEFAULT_CACHE_TTL_MS;
        res.setHeader('Cache-Control', buildCacheControl(ttlMs));
        return res.status(200).json(payload);
    } catch (error) {
        const cacheEntry = getCacheEntry<SiteBuildStatusResponse>(CACHE_KEY);
        if (cacheEntry && Date.now() < cacheEntry.staleUntil) {
            const ttlMs = cacheEntry.data.summary?.inProgress > 0
                ? ACTIVE_CACHE_TTL_MS
                : DEFAULT_CACHE_TTL_MS;
            res.setHeader('Cache-Control', buildCacheControl(ttlMs));
            return res.status(200).json(cacheEntry.data);
        }
        return res.status(200).json({
            summary: {building: 0, queued: 0, failed: 0, inProgress: 0},
            production: null,
            previews: [],
            fetchedAt: new Date().toISOString(),
            error: `Build status error: ${error}`,
        });
    }
}
