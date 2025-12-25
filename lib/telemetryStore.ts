import {useSyncExternalStore} from 'react';

type FetchState = 'idle' | 'loading' | 'ready' | 'error';

type CachePayload<T> = {
    payload: T;
    cachedAt: number;
};

type StoreSnapshot<T> = {
    state: FetchState;
    data: T | null;
    isCached: boolean;
};

type RateLimitedPayload = {
    rateLimitedUntil?: string | null;
    refreshLockedUntil?: string | null;
    error?: string | null;
};

type TelemetryStoreConfig<T> = {
    endpoint: string;
    cacheKey: string;
    cacheMaxAgeMs: number;
    getDelayMs: (payload: T | null) => number;
};

const readCache = <T>(cacheKey: string): CachePayload<T> | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(cacheKey);
        if (!raw) return null;
        return JSON.parse(raw) as CachePayload<T>;
    } catch {
        return null;
    }
};

const writeCache = <T>(cacheKey: string, payload: T) => {
    if (typeof window === 'undefined') return;
    try {
        const data: CachePayload<T> = {
            payload,
            cachedAt: Date.now(),
        };
        window.localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {
        // Ignore localStorage failures.
    }
};

export const createTelemetryStore = <T extends RateLimitedPayload>(
    config: TelemetryStoreConfig<T>,
) => {
    let snapshot: StoreSnapshot<T> = {
        state: 'idle',
        data: null,
        isCached: false,
    };
    const listeners = new Set<() => void>();
    let inFlight: Promise<T | null> | null = null;
    let timeoutId: number | null = null;

    const notify = () => {
        listeners.forEach((listener) => listener());
    };

    const updateSnapshot = (next: Partial<StoreSnapshot<T>>) => {
        snapshot = {...snapshot, ...next};
        notify();
    };

    const scheduleNext = (payload: T | null) => {
        if (typeof window === 'undefined') return;
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
        if (listeners.size === 0) return;
        const delay = config.getDelayMs(payload);
        timeoutId = window.setTimeout(() => {
            void fetchStatus();
        }, delay);
    };

    const hydrateFromCache = () => {
        const cached = readCache<T>(config.cacheKey);
        if (!cached) return null;
        if (Date.now() - cached.cachedAt >= config.cacheMaxAgeMs) return null;
        snapshot = {
            state: 'ready',
            data: cached.payload,
            isCached: true,
        };
        notify();
        return cached.payload;
    };

    const fetchStatus = async (forceRefresh = false): Promise<T | null> => {
        if (typeof window === 'undefined') return null;
        if (inFlight) return inFlight;
        if (!snapshot.data) {
            updateSnapshot({state: 'loading'});
        }
        const url = forceRefresh
            ? `${config.endpoint}?refresh=1`
            : config.endpoint;
        const request = fetch(url, {cache: 'no-store'})
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Status ${response.status}`);
                }
                return response.json() as Promise<T>;
            })
            .then((payload) => {
                snapshot = {
                    state: payload.error ? 'error' : 'ready',
                    data: payload,
                    isCached: false,
                };
                notify();
                writeCache(config.cacheKey, payload);
                scheduleNext(payload);
                return payload;
            })
            .catch(() => {
                const cached = readCache<T>(config.cacheKey);
                if (cached && Date.now() - cached.cachedAt < config.cacheMaxAgeMs) {
                    snapshot = {
                        state: 'ready',
                        data: cached.payload,
                        isCached: true,
                    };
                    notify();
                    scheduleNext(cached.payload);
                    return cached.payload;
                }
                updateSnapshot({state: 'error'});
                scheduleNext(null);
                return null;
            })
            .finally(() => {
                inFlight = null;
            });
        inFlight = request;
        return request;
    };

    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        if (listeners.size === 1) {
            const cached = hydrateFromCache();
            void fetchStatus();
            if (cached) {
                scheduleNext(cached);
            }
        }
        return () => {
            listeners.delete(listener);
            if (listeners.size === 0 && timeoutId) {
                window.clearTimeout(timeoutId);
                timeoutId = null;
            }
        };
    };

    const getSnapshot = () => snapshot;

    const useTelemetryStore = () => {
        const storeSnapshot = useSyncExternalStore(
            subscribe,
            getSnapshot,
            getSnapshot,
        );
        return {
            ...storeSnapshot,
            refresh: (forceRefresh = true) => fetchStatus(forceRefresh),
            rateLimitedUntil: storeSnapshot.data?.rateLimitedUntil ?? null,
            refreshLockedUntil: storeSnapshot.data?.refreshLockedUntil ?? null,
        };
    };

    return {
        useTelemetryStore,
        refresh: (forceRefresh = true) => fetchStatus(forceRefresh),
    };
};
