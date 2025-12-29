const parseCacheMs = (
    value: string | undefined,
    fallback: number,
    label: string,
) => {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        console.warn(
            `Invalid ${label} value "${value}". Falling back to ${fallback}.`,
        );
        return fallback;
    }
    return parsed;
};

const GLOBAL_CACHE_TTL_MS = parseCacheMs(
    process.env.GLOBAL_CACHE_TTL_MS,
    5 * 60 * 1000,
    'GLOBAL_CACHE_TTL_MS',
);

const GLOBAL_CACHE_STALE_MS = parseCacheMs(
    process.env.GLOBAL_CACHE_STALE_MS,
    60 * 60 * 1000,
    'GLOBAL_CACHE_STALE_MS',
);

export const resolveCacheMs = (envKey: string, fallback: number) =>
    parseCacheMs(process.env[envKey], fallback, envKey);

export const resolveCacheConfig = (
    ttlKey: string,
    staleKey: string,
    fallbackTtl = GLOBAL_CACHE_TTL_MS,
    fallbackStale = GLOBAL_CACHE_STALE_MS,
) => ({
    ttlMs: resolveCacheMs(ttlKey, fallbackTtl),
    staleMs: resolveCacheMs(staleKey, fallbackStale),
});

export const getGlobalCacheDefaults = () => ({
    ttlMs: GLOBAL_CACHE_TTL_MS,
    staleMs: GLOBAL_CACHE_STALE_MS,
});
