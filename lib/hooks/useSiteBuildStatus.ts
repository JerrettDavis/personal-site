import type {SiteBuildStatusResponse} from '../siteBuild';
import {createTelemetryStore} from '../telemetryStore';

const CACHE_KEY = 'site-build-status-cache';
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const POLL_ACTIVE_MS = 25 * 1000;
const POLL_IDLE_MS = 2 * 60 * 1000;

const siteBuildStore = createTelemetryStore<SiteBuildStatusResponse>({
    endpoint: '/api/site-build-status',
    cacheKey: CACHE_KEY,
    cacheMaxAgeMs: CACHE_MAX_AGE_MS,
    getDelayMs: (payload) => {
        if (!payload) return POLL_IDLE_MS;
        const rateLimitedUntil = payload.rateLimitedUntil
            ? Date.parse(payload.rateLimitedUntil)
            : 0;
        if (rateLimitedUntil && rateLimitedUntil > Date.now()) {
            return Math.max(rateLimitedUntil - Date.now(), POLL_IDLE_MS);
        }
        return payload.summary.inProgress > 0 ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    },
});

export const useSiteBuildStatus = () => {
    const {
        state,
        data,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    } = siteBuildStore.useTelemetryStore();

    return {
        state,
        data,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    };
};
