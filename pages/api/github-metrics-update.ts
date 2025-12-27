import type {NextApiRequest, NextApiResponse} from 'next';
import {getMetricsStore} from '../../lib/metricsStore';
import {clearInFlight, getInFlight, setInFlight} from '../../lib/cacheStore';

const {updateGithubMetrics} = require('../../scripts/updateGithubMetrics');

type MetricsUpdateResponse = {
    ok: boolean;
    status?: 'updated' | 'in_progress' | 'skipped' | 'error';
    message?: string;
    updatedAt?: string | null;
    startedAt?: string | null;
    inProgress?: boolean;
    skipped?: boolean;
    nextAllowedAt?: string | null;
};

const CACHE_KEY = 'github-metrics-update';
const LOCK_STALE_MS = 4 * 60 * 60 * 1000;
const DEFAULT_MIN_INTERVAL_MS =
    process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 5 * 60 * 1000;

const getMinIntervalMs = () => {
    const raw = Number(process.env.METRICS_UPDATE_MIN_INTERVAL_MS ?? '');
    if (Number.isFinite(raw) && raw > 0) return raw;
    return DEFAULT_MIN_INTERVAL_MS;
};

const isCronRequest = (req: NextApiRequest) => {
    const header = req.headers['x-vercel-cron'];
    return Boolean(header) && header !== '0' && header !== 'false';
};

const hasValidSecret = (req: NextApiRequest) => {
    const secret = process.env.METRICS_UPDATE_SECRET;
    if (!secret) return true;
    const authHeader = req.headers.authorization ?? '';
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === secret) {
        return true;
    }
    return token === secret;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<MetricsUpdateResponse>,
) {
    if (req.method && !['GET', 'POST'].includes(req.method)) {
        return res.status(405).json({ok: false, message: 'Method not allowed.'});
    }

    if (!process.env.GITHUB_TOKEN) {
        return res
            .status(200)
            .json({ok: false, status: 'error', message: 'Missing GITHUB_TOKEN.'});
    }

    if (!hasValidSecret(req) && !isCronRequest(req)) {
        return res.status(401).json({ok: false, message: 'Unauthorized.'});
    }

    const inflight = getInFlight<MetricsUpdateResponse>(CACHE_KEY);
    if (inflight) {
        const payload = await inflight;
        return res.status(200).json(payload);
    }

    const promise = (async () => {
        const store = await getMetricsStore();
        const now = Date.now();
        const lock = await store.getLock();
        const lockStartedAt = lock?.startedAt ? Date.parse(lock.startedAt) : 0;
        if (
            lock &&
            Number.isFinite(lockStartedAt) &&
            now - lockStartedAt < LOCK_STALE_MS
        ) {
            return {
                ok: false,
                status: 'in_progress',
                inProgress: true,
                startedAt: lock?.startedAt ?? null,
                message: 'Metrics update already running.',
            };
        }

        const history = await store.getHistory();
        const historyUpdatedAt = history?.generatedAt
            ? Date.parse(history.generatedAt)
            : 0;
        const minIntervalMs = getMinIntervalMs();
        if (historyUpdatedAt && now - historyUpdatedAt < minIntervalMs) {
            return {
                ok: false,
                status: 'skipped',
                skipped: true,
                updatedAt: history?.generatedAt ?? null,
                nextAllowedAt: new Date(historyUpdatedAt + minIntervalMs).toISOString(),
                message: 'Metrics updated recently.',
            };
        }

        try {
            const result = await updateGithubMetrics({loadEnv: false});
            const latest = await store.getHistory();
            if (result?.status === 'skipped') {
                return {
                    ok: false,
                    status: 'skipped',
                    skipped: true,
                    updatedAt: result?.updatedAt ?? latest?.generatedAt ?? null,
                    nextAllowedAt: result?.nextAllowedAt ?? null,
                    message: 'Metrics updated recently.',
                };
            }
            return {
                ok: true,
                status: result?.status === 'in_progress' ? 'in_progress' : 'updated',
                inProgress: result?.status === 'in_progress',
                updatedAt: latest?.generatedAt ?? null,
            };
        } catch (error) {
            return {
                ok: false,
                status: 'error',
                message: `Metrics update failed: ${error}`,
            };
        }
    })().finally(() => clearInFlight(CACHE_KEY));

    setInFlight(CACHE_KEY, promise);
    const payload = await promise;
    return res.status(200).json(payload);
}
