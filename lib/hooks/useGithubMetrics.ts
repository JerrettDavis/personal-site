import type {GithubMetricsResponse} from '../githubMetricsTypes';
import {createTelemetryStore} from '../telemetryStore';

const CACHE_KEY = 'github-metrics-cache';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const POLL_IDLE_MS = 30 * 60 * 1000;

const metricsStore = createTelemetryStore<GithubMetricsResponse>({
    endpoint: '/api/github-metrics',
    cacheKey: CACHE_KEY,
    cacheMaxAgeMs: CACHE_MAX_AGE_MS,
    getDelayMs: () => POLL_IDLE_MS,
});

export const useGithubMetrics = () => {
    const {
        state,
        data,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    } = metricsStore.useTelemetryStore();

    return {
        state,
        data,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    };
};
