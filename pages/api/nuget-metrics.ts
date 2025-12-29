import type {NextApiRequest, NextApiResponse} from 'next';
import type {NugetMetricsResponse} from '../../lib/nuget';
import {
    fetchNugetPackageSnapshots,
    getNugetPackagesForProjects,
} from '../../lib/nuget';
import {resolveCacheConfig} from '../../lib/cacheConfig';
import {
    checkManualRefresh,
    clearInFlight,
    getCacheEntry,
    getInFlight,
    setCacheEntry,
    setInFlight,
} from '../../lib/cacheStore';

const CACHE_KEY = 'nuget-metrics';
const {ttlMs: CACHE_TTL_MS, staleMs: STALE_TTL_MS} = resolveCacheConfig(
    'NUGET_CACHE_TTL_MS',
    'NUGET_CACHE_STALE_MS',
);
const CACHE_CONTROL_HEADER = `public, s-maxage=${Math.ceil(
    CACHE_TTL_MS / 1000,
)}, stale-while-revalidate=${Math.ceil(STALE_TTL_MS / 1000)}`;
const MANUAL_REFRESH_COOLDOWN_MS = 30 * 60 * 1000;

const buildPayload = async (): Promise<NugetMetricsResponse> => {
    const packageIds = getNugetPackagesForProjects();
    if (packageIds.length === 0) {
        return {
            packages: [],
            totalDownloads: 0,
            fetchedAt: new Date().toISOString(),
        };
    }
    const packages = await fetchNugetPackageSnapshots(packageIds);
    const totalDownloads = packages.reduce(
        (sum, pkg) => sum + (pkg.totalDownloads ?? 0),
        0,
    );
    return {
        packages,
        totalDownloads,
        fetchedAt: new Date().toISOString(),
    };
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<NugetMetricsResponse>,
) {
    try {
        const now = Date.now();
        const forceRefresh = req.query.refresh === '1';
        const cacheEntry = getCacheEntry<NugetMetricsResponse>(CACHE_KEY);

        if (!forceRefresh && cacheEntry && now < cacheEntry.expiresAt) {        
            res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
            return res.status(200).json(cacheEntry.data);
        }

        if (forceRefresh) {
            const refresh = checkManualRefresh(CACHE_KEY, MANUAL_REFRESH_COOLDOWN_MS);
            if (!refresh.allowed) {
                const refreshLockedUntil = new Date(refresh.nextAllowedAt).toISOString();
                if (cacheEntry) {
                    res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
                    return res.status(200).json({
                        ...cacheEntry.data,
                        refreshLockedUntil,
                    });
                }
                return res.status(200).json({
                    packages: [],
                    totalDownloads: 0,
                    fetchedAt: new Date().toISOString(),
                    refreshLockedUntil,
                });
            }
        }

        const inflight = getInFlight<NugetMetricsResponse>(CACHE_KEY);
        if (inflight) {
            const payload = await inflight;
            return res.status(200).json(payload);
        }

        const promise = buildPayload()
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
        const cacheEntry = getCacheEntry<NugetMetricsResponse>(CACHE_KEY);
        if (cacheEntry && Date.now() < cacheEntry.staleUntil) {
            res.setHeader('Cache-Control', CACHE_CONTROL_HEADER);
            return res.status(200).json(cacheEntry.data);
        }
        return res.status(200).json({
            packages: [],
            totalDownloads: 0,
            fetchedAt: new Date().toISOString(),
            error: `NuGet metrics error: ${error}`,
        });
    }
}
