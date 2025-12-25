type CacheEntry<T> = {
    data: T;
    expiresAt: number;
    staleUntil: number;
};

type RateLimitEntry = {
    until: number;
    reason?: string;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const manualRefresh = new Map<string, number>();
const rateLimits = new Map<string, RateLimitEntry>();

const now = () => Date.now();

export const getCacheEntry = <T>(key: string): CacheEntry<T> | null => {
    const entry = cache.get(key);
    return entry ? (entry as CacheEntry<T>) : null;
};

export const setCacheEntry = <T>(key: string, data: T, ttlMs: number, staleMs: number) => {
    const timestamp = now();
    const entry: CacheEntry<T> = {
        data,
        expiresAt: timestamp + ttlMs,
        staleUntil: timestamp + ttlMs + staleMs,
    };
    cache.set(key, entry);
    return entry;
};

export const getInFlight = <T>(key: string): Promise<T> | null => {
    const value = inFlight.get(key);
    return value ? (value as Promise<T>) : null;
};

export const setInFlight = <T>(key: string, promise: Promise<T>) => {
    inFlight.set(key, promise as Promise<unknown>);
};

export const clearInFlight = (key: string) => {
    inFlight.delete(key);
};

export const getRateLimit = (provider: string) => {
    const entry = rateLimits.get(provider);
    if (!entry) return null;
    if (entry.until <= now()) {
        rateLimits.delete(provider);
        return null;
    }
    return entry;
};

export const setRateLimit = (provider: string, until: number, reason?: string) => {
    const current = rateLimits.get(provider);
    if (!current || until > current.until) {
        rateLimits.set(provider, {until, reason});
    }
};

export const checkManualRefresh = (key: string, cooldownMs: number) => {
    const timestamp = now();
    const lastRefresh = manualRefresh.get(key);
    const nextAllowedAt = (lastRefresh ?? 0) + cooldownMs;
    if (lastRefresh && timestamp < nextAllowedAt) {
        return {allowed: false, nextAllowedAt};
    }
    manualRefresh.set(key, timestamp);
    return {allowed: true, nextAllowedAt: timestamp + cooldownMs};
};
