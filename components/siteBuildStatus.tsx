import {useEffect, useState} from 'react';
import Link from 'next/link';
import styles from './siteBuildStatus.module.css';
import {useSiteBuildStatus} from '../lib/hooks/useSiteBuildStatus';

const RELEASE_KEY = 'site-build-latest-release';

export default function SiteBuildStatus({
    compact = false,
    variant = 'header',
    className,
}: {
    compact?: boolean;
    variant?: 'header' | 'menu';
    className?: string;
}) {
    const {data, state, isCached} = useSiteBuildStatus();
    const [showToast, setShowToast] = useState(false);

    const previewCount = data?.previews.length ?? 0;
    const inProgress = data?.summary.inProgress ?? 0;
    const isLoading = state === 'loading';
    const isError = state === 'error';
    const statusLabel = isError
        ? 'Telemetry offline'
        : inProgress > 0
            ? 'Build in progress'
            : 'Site live';

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const productionId = data?.production?.id;
        if (!productionId || data?.production?.status !== 'ready') return;
        const previous = window.localStorage.getItem(RELEASE_KEY);
        if (previous && previous !== productionId) {
            setShowToast(true);
        }
        window.localStorage.setItem(RELEASE_KEY, productionId);
    }, [data?.production?.id, data?.production?.status]);

    const statusText = compact
        ? isError ? 'Offline' : inProgress > 0 ? 'Build' : 'Live'
        : statusLabel;
    const previewText = compact ? `${previewCount}` : `${previewCount} previews`;

    return (
        <>
            <Link
                href="/work-in-progress"
                className={`${styles.badge} glowable ${className ?? ''}`}
                data-compact={compact ? 'true' : undefined}
                data-variant={variant}
            >
                <span className={`${styles.dot} ${inProgress > 0 ? styles.dotActive : ''}`} />
                <span className={styles.label}>Site</span>
                <span className={styles.status}>{isLoading ? 'Checking' : statusText}</span>
                <span className={styles.previewCount}>
                    {previewText}
                </span>
                {isCached && <span className={styles.cached}>Cached</span>}
            </Link>
            {showToast && (
                <div className={styles.toast} role="status" aria-live="polite">
                    <div className={styles.toastHeader}>
                        <div>
                            <div className={styles.toastTitle}>New build shipped</div>
                            <div className={styles.toastText}>
                                A fresh release just landed. Reload when you are ready.
                            </div>
                        </div>
                        <button
                            type="button"
                            className={styles.toastClose}
                            onClick={() => setShowToast(false)}
                            aria-label="Dismiss notification"
                        >
                            x
                        </button>
                    </div>
                    <div className={styles.toastActions}>
                        <Link href="/work-in-progress" className={styles.toastLink}>
                            See what is in the works
                        </Link>
                        <button
                            type="button"
                            className={styles.toastLink}
                            onClick={() => window.location.reload()}
                        >
                            Refresh now
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
