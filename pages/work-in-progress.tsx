import Head from 'next/head';
import Layout from '../components/layout';
import StatGrid from '../components/statGrid';
import DateStamp from '../components/date';
import styles from './work-in-progress.module.css';
import {useSiteBuildStatus} from '../lib/hooks/useSiteBuildStatus';
import type {BuildDeployment} from '../lib/siteBuild';

const STATUS_LABELS: Record<string, string> = {
    building: 'Building',
    queued: 'Queued',
    ready: 'Ready',
    error: 'Failed',
    canceled: 'Canceled',
    unknown: 'Unknown',
};

export default function WorkInProgress() {
    const {
        data,
        state,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    } = useSiteBuildStatus();
    const previews = data?.previews ?? [];
    const summary = data?.summary;
    const production = data?.production;
    const isLoading = state === 'loading';
    const isError = state === 'error';
    const now = globalThis.Date.now();
    const isRefreshLocked = refreshLockedUntil
        ? globalThis.Date.parse(refreshLockedUntil) > now
        : false;
    const isRateLimited = rateLimitedUntil
        ? globalThis.Date.parse(rateLimitedUntil) > now
        : false;

    const stats = [
        {id: 'previews', label: 'Previews', value: previews.length},
        {id: 'building', label: 'Building', value: summary?.building ?? 0},
        {id: 'queued', label: 'Queued', value: summary?.queued ?? 0},
        {id: 'failed', label: 'Failed', value: summary?.failed ?? 0},
    ];

    return (
        <Layout description="Live preview deployments and build telemetry for this site.">
            <Head>
                <title>Work in Progress - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Work in progress</p>
                <h1 className={styles.title}>See what is in the works</h1>
                <p className={styles.lede}>
                    Active preview deployments and build signals for the personal site.
                </p>
                <StatGrid
                    items={stats}
                    gridClassName={styles.statsGrid}
                    itemClassName={`${styles.statCard} glowable`}
                    valueClassName={styles.statValue}
                    labelClassName={styles.statLabel}
                />
                <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Last updated</span>
                    <span className={styles.metaValue}>
                        {data?.fetchedAt ? <DateStamp dateString={data.fetchedAt} /> : 'Loading'}
                    </span>
                    <button
                        type="button"
                        className={styles.refreshButton}
                        onClick={() => refresh()}
                        disabled={state === 'loading' || isRefreshLocked || isRateLimited}
                    >
                        Refresh
                    </button>
                    {isCached && <span className={styles.metaCache}>Cached</span>}
                </div>
                {isRateLimited && rateLimitedUntil && (
                    <div className={styles.notice}>
                        Rate limited until <DateStamp dateString={rateLimitedUntil} />.
                    </div>
                )}
                {isRefreshLocked && refreshLockedUntil && (
                    <div className={styles.notice}>
                        Refresh available at <DateStamp dateString={refreshLockedUntil} />.
                    </div>
                )}
                {production && (
                    <div className={styles.productionCard}>
                        <div>
                            <p className={styles.productionKicker}>Latest production</p>
                            <p className={styles.productionTitle}>Live build</p>
                        </div>
                        <div className={styles.productionMeta}>
                            <a href={production.url} target="_blank" rel="noreferrer">
                                {production.url.replace(/^https?:\/\//, '')}
                            </a>
                            <span className={styles.productionTime}>
                                <DateStamp dateString={production.createdAt} />
                            </span>
                        </div>
                    </div>
                )}
                {isError && (
                    <div className={styles.notice}>
                        Build telemetry is currently unavailable. Configure Vercel credentials to enable live data.
                    </div>
                )}
            </section>
            <section className={styles.previewSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Preview deployments</h2>
                    <p className={styles.sectionLead}>
                        Branch and PR previews stay online until superseded or removed.
                    </p>
                </div>
                <div className={styles.previewGrid}>
                    {previews.map((preview) => (
                        <PreviewCard key={preview.id} preview={preview} />
                    ))}
                </div>
                {!isLoading && previews.length === 0 && (
                    <div className={styles.emptyState}>
                        No preview deployments found.
                    </div>
                )}
            </section>
        </Layout>
    );
}

const PreviewCard = ({preview}: {preview: BuildDeployment}) => {
    const statusLabel = STATUS_LABELS[preview.status] ?? 'Unknown';
    const branchLabel = preview.branch ?? 'Preview';
    const previewHost = preview.url ? preview.url.replace(/^https?:\/\//, '') : 'Preview unavailable';
    return (
        <article className={styles.previewCard} data-status={preview.status} data-pr={preview.prId ? 'true' : 'false'}>
            <div className={styles.previewHeader}>
                <div>
                    <p className={styles.previewBranch}>{branchLabel}</p>
                    <p className={styles.previewHost}>{previewHost}</p>
                </div>
                <span className={styles.statusBadge} data-status={preview.status}>
                    {statusLabel}
                </span>
            </div>
            {preview.commitMessage && (
                <p className={styles.previewMessage}>{preview.commitMessage}</p>
            )}
            <div className={styles.previewMeta}>
                <span className={styles.previewTime}>
                    <DateStamp dateString={preview.createdAt} />
                </span>
                {preview.prId && preview.prUrl && (
                    <a href={preview.prUrl} target="_blank" rel="noreferrer" className={styles.previewLink}>
                        PR #{preview.prId}
                    </a>
                )}
                {preview.author && (
                    <span className={styles.previewAuthor}>{preview.author}</span>
                )}
            </div>
            <div className={styles.previewActions}>
                {preview.url ? (
                    <a href={preview.url} target="_blank" rel="noreferrer" className={`${styles.actionLink} glowable`}>
                        Open preview
                    </a>
                ) : (
                    <span className={styles.actionLink}>No preview URL</span>
                )}
                {preview.prUrl && (
                    <a href={preview.prUrl} target="_blank" rel="noreferrer" className={`${styles.actionLink} glowable`}>
                        View PR
                    </a>
                )}
            </div>
        </article>
    );
};
