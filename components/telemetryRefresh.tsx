import {useState} from 'react';
import DateStamp from './date';
import styles from './telemetryRefresh.module.css';
import {usePipelineStatus} from '../lib/hooks/usePipelineStatus';
import {useSiteBuildStatus} from '../lib/hooks/useSiteBuildStatus';

type RefreshState = 'idle' | 'loading' | 'done' | 'cooldown' | 'rate-limited';

const getLatestUntil = (values: Array<string | null | undefined>) => {
    const times = values
        .map((value) => (value ? Date.parse(value) : 0))
        .filter((value) => value > globalThis.Date.now());
    if (times.length === 0) return null;
    return new globalThis.Date(Math.max(...times)).toISOString();
};

export default function TelemetryRefresh() {
    const {refresh: refreshBuild, data: buildData} = useSiteBuildStatus();
    const {refresh: refreshPipelines, data: pipelineData} = usePipelineStatus();
    const [state, setState] = useState<RefreshState>('idle');
    const [until, setUntil] = useState<string | null>(null);

    const derivedRateLimit = getLatestUntil([
        buildData?.rateLimitedUntil,
        pipelineData?.rateLimitedUntil,
    ]);
    const derivedCooldown = getLatestUntil([
        buildData?.refreshLockedUntil,
        pipelineData?.refreshLockedUntil,
    ]);

    const rateLimitedUntil = state === 'rate-limited' ? until : derivedRateLimit;
    const refreshLockedUntil = rateLimitedUntil
        ? null
        : state === 'cooldown'
            ? until
            : derivedCooldown;

    const isBlocked = state === 'loading' || Boolean(rateLimitedUntil) || Boolean(refreshLockedUntil);

    const handleRefresh = async () => {
        if (isBlocked) return;
        setState('loading');
        setUntil(null);
        try {
            const [buildPayload, pipelinePayload] = await Promise.all([
                refreshBuild(),
                refreshPipelines(),
            ]);
            const rateLimited = getLatestUntil([
                buildPayload?.rateLimitedUntil ?? buildData?.rateLimitedUntil,
                pipelinePayload?.rateLimitedUntil ?? pipelineData?.rateLimitedUntil,
            ]);
            if (rateLimited) {
                setUntil(rateLimited);
                setState('rate-limited');
                return;
            }
            const refreshLocked = getLatestUntil([
                buildPayload?.refreshLockedUntil ?? buildData?.refreshLockedUntil,
                pipelinePayload?.refreshLockedUntil ?? pipelineData?.refreshLockedUntil,
            ]);
            if (refreshLocked) {
                setUntil(refreshLocked);
                setState('cooldown');
                return;
            }
            setState('done');
            window.setTimeout(() => setState('idle'), 4000);
        } catch {
            setState('idle');
        }
    };

    const label = state === 'loading'
        ? 'Refreshing'
        : state === 'done'
            ? 'Refreshed'
            : 'Refresh telemetry';

    return (
        <div className={styles.refresh}>
            <button
                type="button"
                className={styles.refreshButton}
                onClick={handleRefresh}
                disabled={isBlocked}
            >
                {label}
            </button>
            {rateLimitedUntil && (
                <span className={styles.refreshNote}>
                    Rate limited until <DateStamp dateString={rateLimitedUntil} />
                </span>
            )}
            {!rateLimitedUntil && refreshLockedUntil && (
                <span className={styles.refreshNote}>
                    Available at <DateStamp dateString={refreshLockedUntil} />
                </span>
            )}
        </div>
    );
}
