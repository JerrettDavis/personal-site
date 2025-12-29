import type {NugetMetricsResponse} from '../nuget';
import {createTelemetryStore} from '../telemetryStore';

const CACHE_KEY = 'nuget-metrics-cache';
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const POLL_IDLE_MS = 6 * 60 * 60 * 1000;

const nugetStore = createTelemetryStore<NugetMetricsResponse>({
    endpoint: '/api/nuget-metrics',
    cacheKey: CACHE_KEY,
    cacheMaxAgeMs: CACHE_MAX_AGE_MS,
    getDelayMs: () => POLL_IDLE_MS,
});

export const useNugetMetrics = () => {
    const {
        state,
        data,
        isCached,
        refresh,
        refreshLockedUntil,
    } = nugetStore.useTelemetryStore();

    return {
        state,
        data,
        isCached,
        refresh,
        refreshLockedUntil,
    };
};
