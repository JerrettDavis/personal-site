import {useMemo} from 'react';
import Head from 'next/head';
import Layout from '../components/layout';
import StatGrid from '../components/statGrid';
import DateStamp from '../components/date';
import styles from './pipelines.module.css';
import type {PipelineRepoStatus} from '../lib/pipelines';
import {usePipelineStatus} from '../lib/hooks/usePipelineStatus';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faCircleInfo, faXmark} from '@fortawesome/free-solid-svg-icons';

const STATUS_LABELS: Record<string, string> = {
    running: 'Running',
    passing: 'Passing',
    failing: 'Failing',
    unknown: 'Unknown',
};

const STATUS_ICONS = {
    running: faCircleInfo,
    passing: faCheck,
    failing: faXmark,
    unknown: faCircleInfo,
};

const STATUS_ORDER: Record<string, number> = {
    running: 0,
    failing: 1,
    passing: 2,
    unknown: 3,
};

export default function Pipelines() {
    const {
        data,
        state,
        isCached,
        refresh,
        rateLimitedUntil,
        refreshLockedUntil,
    } = usePipelineStatus();

    const repos = data?.repos ?? [];
    const summary = data?.summary;
    const error = data?.error ?? null;
    const now = globalThis.Date.now();
    const isRefreshLocked = refreshLockedUntil
        ? globalThis.Date.parse(refreshLockedUntil) > now
        : false;
    const isRateLimited = rateLimitedUntil
        ? globalThis.Date.parse(rateLimitedUntil) > now
        : false;
    const sortedRepos = useMemo(() => {
        return [...repos].sort((a, b) => {
            const orderA = STATUS_ORDER[a.status] ?? 99;
            const orderB = STATUS_ORDER[b.status] ?? 99;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });
    }, [repos]);

    const stats = [
        {id: 'running', label: 'Running', value: summary?.running ?? 0},
        {id: 'passing', label: 'Passing', value: summary?.passing ?? 0},
        {id: 'failing', label: 'Failing', value: summary?.failing ?? 0},
        {id: 'unknown', label: 'Unknown', value: summary?.unknown ?? 0},
    ];

    return (
        <Layout description="Live build pipeline status across active GitHub repositories.">
            <Head>
                <title>Pipelines - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Telemetry</p>
                <h1 className={styles.title}>Pipeline status</h1>
                <p className={styles.lede}>
                    A real-time snapshot of GitHub Actions runs across active repos.
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
                {error && !isRateLimited && (
                    <div className={styles.notice}>
                        <strong>GitHub status unavailable.</strong> {error}
                    </div>
                )}
            </section>
            <section className={styles.repoSection}>
                <h2 className={styles.sectionTitle}>Repo activity</h2>
                <div className={styles.repoGrid}>
                    {sortedRepos.map((repo) => (
                        <RepoCard repo={repo} key={repo.id} />
                    ))}
                </div>
                {state !== 'loading' && !error && sortedRepos.length === 0 && (
                    <div className={styles.emptyState}>
                        Loading pipeline data.
                    </div>
                )}
            </section>
        </Layout>
    );
}

const RepoCard = ({repo}: {repo: PipelineRepoStatus}) => {
    const statusLabel = STATUS_LABELS[repo.status] ?? 'Unknown';
    const statusIcon = STATUS_ICONS[repo.status] ?? faCircleInfo;
    return (
        <article className={styles.repoCard} data-status={repo.status}>
            <div className={styles.repoHeader}>
                <h3 className={styles.repoTitle}>
                    <a href={repo.htmlUrl} target="_blank" rel="noreferrer">
                        {repo.name}
                    </a>
                </h3>
                <span
                    className={styles.statusBadge}
                    data-status={repo.status}
                    aria-label={`Status: ${statusLabel}`}
                    title={statusLabel}
                >
                    <FontAwesomeIcon icon={statusIcon} />
                </span>
            </div>
            <p className={styles.repoMeta}>{repo.fullName}</p>
            <div className={styles.repoDetails}>
                {repo.runUrl ? (
                    <a href={repo.runUrl} target="_blank" rel="noreferrer" className={styles.runLink}>
                        {repo.runName ?? 'Latest workflow'}
                    </a>
                ) : (
                    <span className={styles.runPlaceholder}>No workflow runs</span>
                )}
                <span className={styles.runTime}>
                    {repo.updatedAt ? <DateStamp dateString={repo.updatedAt} /> : 'n/a'}
                </span>
            </div>
            {repo.note && <p className={styles.repoNote}>{repo.note}</p>}
        </article>
    );
};
