import type {PipelineStatusResponse} from '../pipelines';
import {createTelemetryStore} from '../telemetryStore';

const CACHE_KEY = 'pipeline-status-cache';
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;
const POLL_ACTIVE_MS = 60 * 1000;
const POLL_IDLE_MS = 8 * 60 * 1000;

const pipelineStore = createTelemetryStore<PipelineStatusResponse>({
    endpoint: '/api/pipeline-status',
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
        return payload.summary.running > 0 ? POLL_ACTIVE_MS : POLL_IDLE_MS;
    },
});

export const usePipelineStatus = () => {
    const {
        state,
        data,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    } = pipelineStore.useTelemetryStore();

    return {
        state,
        data,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    };
};
