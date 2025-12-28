import Link from 'next/link';
import styles from './pipelineStatus.module.css';
import {usePipelineStatus} from '../lib/hooks/usePipelineStatus';

export default function PipelineStatus({
    compact = false,
    variant = 'header',
    className,
}: {
    compact?: boolean;
    variant?: 'header' | 'menu';
    className?: string;
}) {
    const {data, state} = usePipelineStatus();

    const summary = data?.summary;
    const isReady = state === 'ready' && summary;
    const isError = state === 'error';

    const label = compact ? 'CI' : 'Pipelines';

    return (
        <Link
            href="/projects#pipeline-metrics"
            className={`${styles.badge} glowable ${className ?? ''}`}
            aria-live="polite"
            aria-label="View pipeline metrics overview"
            data-variant={variant}
            data-compact={compact ? 'true' : undefined}
        >
            <span className={styles.label}>{label}</span>
            {isReady ? (
                <span className={styles.counts}>
                    <span className={styles.count} data-status="running">
                        <span className={styles.dot} />
                        {summary.running}
                    </span>
                    <span className={styles.count} data-status="passing">
                        <span className={styles.dot} />
                        {summary.passing}
                    </span>
                    <span className={styles.count} data-status="failing">
                        <span className={styles.dot} />
                        {summary.failing}
                    </span>
                </span>
            ) : (
                <span className={styles.meta}>
                    {isError ? 'Unavailable' : 'Loading'}
                </span>
            )}
        </Link>
    );
}
