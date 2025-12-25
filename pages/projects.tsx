import Head from "next/head";
import Layout from "../components/layout";
import Link from "next/link";
import styles from "./projects.module.css";
import {GetStaticProps} from "next";
import {getActiveRepos, GitHubRepo} from "../lib/github";
import {GITHUB_USERNAME, PROJECT_ACTIVITY_DAYS, PROJECT_OVERRIDES} from "../data/projects";
import type {ProjectLink, ProjectMeta} from "../data/projects";
import DateStamp from "../components/date";
import {getSortedPostsData} from "../lib/posts";
import type {PostSummary} from "../lib/posts";
import type {CSSProperties} from "react";
import {useEffect, useMemo, useRef, useState} from "react";
import PostSummaries from "../components/postSummaries";
import {matchPostsByTags} from "../lib/post-matching";
import StatGrid from "../components/statGrid";
import RelatedPosts from "../components/relatedPosts";
import {usePipelineStatus} from "../lib/hooks/usePipelineStatus";
import type {PipelineRepoStatus, PipelineState} from "../lib/pipelines";
import type {ProjectDetailResponse} from "../lib/projectDetails";

interface ProjectCard {
    repo: GitHubRepo;
    meta: ProjectMeta | null;
    relatedPosts: PostSummary[];
}

interface ProjectsProps {
    projects: ProjectCard[];
    githubError: string | null;
    projectPosts: PostSummary[];
}

const collectTags = (meta?: ProjectMeta | null, repoTopics: string[] = []): string[] => {
    if (!meta && repoTopics.length === 0) return [];
    return [
        meta?.primaryTag,
        ...(meta?.tags ?? []),
        ...(meta?.relatedTags ?? []),
        ...repoTopics,
    ].filter((tag): tag is string => Boolean(tag));
};

const getRelatedPosts = (
    posts: PostSummary[],
    meta?: ProjectMeta | null,
    repoTopics: string[] = [],
): PostSummary[] => {
    if (!meta && repoTopics.length === 0) return [];
    const related = new Map<string, PostSummary>();

    if (meta?.relatedPosts?.length) {
        meta.relatedPosts.forEach((id: string) => {
            const post = posts.find((p) => p.id === id);
            if (post) related.set(post.id, post);
        });
    }

    const tagSet = collectTags(meta, repoTopics);
    matchPostsByTags(posts, tagSet).forEach((post) => {
        related.set(post.id, post);
    });

    return Array.from(related.values()).slice(0, 3);
};

export default function Projects({projects, githubError, projectPosts}: ProjectsProps) {
    const isDev = process.env.NODE_ENV === 'development';
    const errorSummary = isDev ? githubError : 'GitHub data is temporarily unavailable.';
    const lede = 'Everything here has seen GitHub activity in the last year. Each card blends stats with my own notes, topics, and relevant writing.';
    const totalStars = projects.reduce((sum, project) => sum + (project.repo.stargazers_count ?? 0), 0);
    const featuredCount = projects.filter((project) => project.meta?.featured).length;
    const latestPushedAt = projects[0]?.repo?.pushed_at;
    const stats = [
        {id: 'active', label: 'Active repos', value: projects.length},
        {id: 'featured', label: 'Featured', value: featuredCount},
        {id: 'stars', label: 'Stars', value: totalStars},
        {id: 'latest', label: 'Latest push', value: latestPushedAt ? <DateStamp dateString={latestPushedAt} /> : '---'},
    ];
    const {data: pipelineData} = usePipelineStatus();
    const pipelineSummary = pipelineData?.summary;
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [detailData, setDetailData] = useState<Record<number, ProjectDetailResponse | null>>({});
    const [detailState, setDetailState] = useState<Record<number, 'idle' | 'loading' | 'ready' | 'error'>>({});
    const detailInFlight = useRef(new Map<number, Promise<ProjectDetailResponse | null>>());
    const cardRefs = useRef(new Map<number, HTMLElement>());
    const pendingScrollRef = useRef<number | null>(null);
    const pendingScrollDelayRef = useRef<number>(0);
    const scrollTimeoutRef = useRef<number | null>(null);
    const scrollFollowupRef = useRef<number | null>(null);
    const pipelineMap = useMemo(() => {
        const map = new Map<string, PipelineRepoStatus>();
        pipelineData?.repos?.forEach((repo) => {
            map.set(repo.name.toLowerCase(), repo);
        });
        return map;
    }, [pipelineData?.repos]);

    const statusLabel = (status?: PipelineState) => {
        switch (status) {
            case 'running':
                return 'Running';
            case 'passing':
                return 'Passing';
            case 'failing':
                return 'Failing';
            default:
                return 'Unknown';
        }
    };

    const fetchProjectDetail = async (repo: GitHubRepo) => {
        const cached = detailData[repo.id];
        if (cached) return cached;
        const existing = detailInFlight.current.get(repo.id);
        if (existing) return existing;

        setDetailState((prev) => ({...prev, [repo.id]: 'loading'}));
        const promise = fetch(`/api/project-details?repo=${encodeURIComponent(repo.full_name)}`, {
            cache: 'no-store',
        })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Status ${response.status}`);
                return (await response.json()) as ProjectDetailResponse;
            })
            .then((payload) => {
                setDetailData((prev) => ({...prev, [repo.id]: payload}));
                setDetailState((prev) => ({
                    ...prev,
                    [repo.id]: payload.error ? 'error' : 'ready',
                }));
                return payload;
            })
            .catch(() => {
                setDetailState((prev) => ({...prev, [repo.id]: 'error'}));
                return null;
            })
            .finally(() => {
                detailInFlight.current.delete(repo.id);
            });

        detailInFlight.current.set(repo.id, promise);
        return promise;
    };

    const scrollIntoViewIfNeeded = (repoId: number) => {
        if (typeof window === 'undefined') return;
        const node = cardRefs.current.get(repoId);
        if (!node) return;
        const rect = node.getBoundingClientRect();
        const topPadding = 140;
        const bottomPadding = 160;
        const shouldScroll = rect.top < topPadding
            || rect.bottom > (window.innerHeight - bottomPadding);
        if (!shouldScroll) return;
        const target = Math.max(window.scrollY + rect.top - topPadding, 0);
        window.scrollTo({top: target, behavior: 'smooth'});
    };

    const scheduleScrollIntoView = (repoId: number, delayMs: number) => {
        if (typeof window === 'undefined') return;
        if (scrollTimeoutRef.current) {
            window.clearTimeout(scrollTimeoutRef.current);
        }
        if (scrollFollowupRef.current) {
            window.clearTimeout(scrollFollowupRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
            window.requestAnimationFrame(() => {
                scrollIntoViewIfNeeded(repoId);
            });
            scrollFollowupRef.current = window.setTimeout(() => {
                window.requestAnimationFrame(() => {
                    scrollIntoViewIfNeeded(repoId);
                });
            }, 120);
        }, delayMs);
    };

    const handleExpand = (repo: GitHubRepo) => {
        const wasExpanded = expandedId !== null;
        setExpandedId(repo.id);
        pendingScrollRef.current = repo.id;
        pendingScrollDelayRef.current = wasExpanded ? 360 : 80;
        if (!detailData[repo.id] && detailState[repo.id] !== 'loading') {
            void fetchProjectDetail(repo);
        }
    };

    useEffect(() => {
        if (expandedId === null) return;
        if (pendingScrollRef.current !== expandedId) return;
        scheduleScrollIntoView(expandedId, pendingScrollDelayRef.current);
        pendingScrollRef.current = null;
        return () => {
            if (scrollTimeoutRef.current) {
                window.clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = null;
            }
            if (scrollFollowupRef.current) {
                window.clearTimeout(scrollFollowupRef.current);
                scrollFollowupRef.current = null;
            }
        };
    }, [expandedId]);

    return (
        <Layout description={lede}>
            <Head>
                <title>Projects - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Projects</p>
                <h1 className={styles.title}>Active builds, fresh experiments</h1>
                <p className={styles.lede}>
                    {lede}
                </p>
                <StatGrid
                    items={stats}
                    gridClassName={styles.statsGrid}
                    itemClassName={`${styles.statCard} glowable`}
                    valueClassName={styles.statValue}
                    labelClassName={styles.statLabel}
                />
                {pipelineSummary && (
                    <div className={styles.pipelineCallout}>
                        <div>
                            <p className={styles.pipelineKicker}>Pipelines</p>
                            <h2 className={styles.pipelineTitle}>Build telemetry</h2>
                            <p className={styles.pipelineText}>
                                Live status across active repos. Tap in when builds are moving.
                            </p>
                        </div>
                        <div className={styles.pipelineStats}>
                            <span className={styles.pipelineStat} data-state="running">
                                Running {pipelineSummary.running}
                            </span>
                            <span className={styles.pipelineStat} data-state="passing">
                                Passing {pipelineSummary.passing}
                            </span>
                            <span className={styles.pipelineStat} data-state="failing">
                                Failing {pipelineSummary.failing}
                            </span>
                        </div>
                        <Link href="/pipelines" className={`${styles.pipelineLink} glowable`}>
                            View pipelines
                        </Link>
                    </div>
                )}
            </section>
            {githubError && (
                <div className={styles.notice}>
                    <h2>GitHub data unavailable</h2>
                    <p>{errorSummary}</p>
                    {isDev && (
                        <p>
                            Local dev: run <code>npm run dev</code> from the repo root. If the GitHub API blocks the
                            request, set a <code>GITHUB_TOKEN</code> environment variable.
                        </p>
                    )}
                </div>
            )}
            {projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <h2>No active repos found</h2>
                    <p>
                        GitHub is quiet right now or the API request failed. If this is a build step, consider adding a
                        <code>GITHUB_TOKEN</code> so the site can fetch repo data.
                    </p>
                </div>
            ) : (
                <section
                    className={styles.grid}
                    data-expanded={expandedId ? 'true' : undefined}
                >
                    {projects.map(({repo, meta, relatedPosts}) => {
                        const displayName = meta?.displayName ?? repo.name;
                        const summary = meta?.summary ?? repo.description ?? 'No description yet.';
                        const topics = Array.from(
                            new Set([...(meta?.topics ?? []), ...(repo.topics ?? [])])
                        );
                        const maxTopicPreview = 2;
                        const collapseTopics = topics.length > 3;
                        const previewTopics = collapseTopics ? topics.slice(0, maxTopicPreview) : topics;
                        const extraTopicCount = collapseTopics ? topics.length - previewTopics.length : 0;
                        const popoverTags = Array.from(
                            new Set([...(repo.language ? [repo.language] : []), ...topics])
                        );
                        const popoverId = `project-tags-${repo.id}`;
                        const pipelineStatus = pipelineMap.get(repo.name.toLowerCase());
                        const pipelineState = pipelineStatus?.status ?? 'unknown';
                        const pipelineLabel = statusLabel(pipelineState);
                        const pipelineClassName = pipelineState === 'running'
                            ? styles.pipelineStatusRunning
                            : pipelineState === 'passing'
                                ? styles.pipelineStatusPassing
                                : pipelineState === 'failing'
                                    ? styles.pipelineStatusFailing
                                    : styles.pipelineStatusUnknown;
                        const links = [
                            {label: 'GitHub', url: repo.html_url},
                            repo.homepage ? {label: 'Live', url: repo.homepage} : null,
                            ...(meta?.links ?? []),
                        ].filter((link): link is ProjectLink => Boolean(link));
                        const isExpanded = expandedId === repo.id;
                        const detailId = `project-detail-${repo.id}`;
                        const pipelineDetailLabel = pipelineStatus?.runName
                            ? `${pipelineLabel} - ${pipelineStatus.runName}`
                            : pipelineLabel;
                        const pipelineUpdatedAt = pipelineStatus?.updatedAt ?? null;
                        const pipelineNote = pipelineStatus?.note ?? null;
                        const detailPayload = detailData[repo.id] ?? null;
                        const detailStatus = detailState[repo.id] ?? 'idle';
                        const isDetailLoading = detailStatus === 'loading' && !detailPayload;
                        const isDetailError = detailStatus === 'error' || Boolean(detailPayload?.error);
                        const openIssues = detailPayload?.openIssues ?? null;
                        const openPulls = detailPayload?.openPulls ?? null;
                        const latestRelease = detailPayload?.latestRelease ?? null;
                        const readme = detailPayload?.readme ?? null;
                        const detailFetchedAt = detailPayload?.fetchedAt ?? null;
                        const rateLimitedUntil = detailPayload?.rateLimitedUntil ?? null;
                        const repoIssuesUrl = `${repo.html_url}/issues`;
                        const repoPullsUrl = `${repo.html_url}/pulls`;
                        const repoReleasesUrl = `${repo.html_url}/releases`;
                        const repoReadmeUrl = readme?.url ?? `${repo.html_url}#readme`;

                        const cardStyle = {
                            '--accent': meta?.accent ?? 'var(--color-primary)',
                        } as CSSProperties;

                        return (
                            <article
                                className={`${styles.projectCard} ${meta?.featured ? styles.projectCardFeatured : ''} ${isExpanded ? styles.projectCardExpanded : ''} glowable`}
                                style={cardStyle}
                                key={repo.id}
                                data-expanded={isExpanded ? 'true' : undefined}
                                ref={(node) => {
                                    if (!node) {
                                        cardRefs.current.delete(repo.id);
                                        return;
                                    }
                                    cardRefs.current.set(repo.id, node);
                                }}
                                onClick={(event) => {
                                    const target = event.target as HTMLElement;
                                    if (target.closest('[data-detail-panel="true"]')) {
                                        return;
                                    }
                                    if (target.closest('a, button, input, textarea, select, label, summary, details')) {
                                        return;
                                    }
                                    if (isExpanded) {
                                        setExpandedId(null);
                                        return;
                                    }
                                    handleExpand(repo);
                                }}
                            >
                                <div className={styles.cardBody}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardHeaderMain}>
                                            <h2 className={styles.cardTitle}>
                                                <a href={repo.html_url} target="_blank" rel="noreferrer">
                                                    {displayName}
                                                </a>
                                            </h2>
                                            {meta?.featured && <span className={styles.cardFlag}>Featured</span>}
                                        </div>
                                        <button
                                            type="button"
                                            className={`${styles.detailToggle} glowable`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                if (isExpanded) {
                                                    setExpandedId(null);
                                                } else {
                                                    handleExpand(repo);
                                                }
                                            }}
                                            aria-expanded={isExpanded}
                                            aria-controls={detailId}
                                        >
                                            {isExpanded ? 'Close details' : 'View details'}
                                        </button>
                                    </div>
                                    <p className={styles.cardSummary}>{summary}</p>
                                    <div className={styles.badgeStack}>
                                        <div className={styles.badgeRow}>
                                            {repo.language && <span className={styles.badge}>{repo.language}</span>}
                                            {previewTopics.map((topic) => (
                                                <span className={styles.badge} key={topic}>
                                                    {topic}
                                                </span>
                                            ))}
                                            {collapseTopics && (
                                                <span className={styles.badgeMoreWrap}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.badge} ${styles.badgeMore}`}
                                                        aria-label={`Show all tags for ${displayName}`}
                                                        aria-describedby={popoverId}
                                                    >
                                                        +{extraTopicCount} more
                                                    </button>
                                                    <div className={styles.badgePopover} id={popoverId} role="tooltip">
                                                        <div className={styles.badgePopoverInner}>
                                                            {popoverTags.map((tag) => (
                                                                <span className={styles.badge} key={tag}>
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {meta?.highlights?.length ? (
                                        <ul className={styles.highlightList}>
                                            {meta.highlights.map((highlight) => (
                                                <li key={highlight}>{highlight}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                                <div
                                    className={styles.detailWrap}
                                    id={detailId}
                                    role="region"
                                    aria-label={`${displayName} details`}
                                    aria-hidden={!isExpanded}
                                    data-detail-panel="true"
                                >
                                    <div className={styles.detailInner}>
                                        <div className={styles.detailHeader}>
                                            <div>
                                                <p className={styles.detailKicker}>Detail view</p>
                                                <h3 className={styles.detailTitle}>Signals and context</h3>
                                                {detailFetchedAt && (
                                                    <span className={styles.detailStamp}>
                                                        Updated <DateStamp dateString={detailFetchedAt} />
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className={styles.detailClose}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setExpandedId(null);
                                                }}
                                            >
                                                Collapse
                                            </button>
                                        </div>
                                        {isDetailLoading ? (
                                            <>
                                                <div className={styles.detailGrid}>
                                                    {Array.from({length: 4}).map((_, index) => (
                                                        <div
                                                            className={`${styles.detailItem} ${styles.detailSkeletonCard}`}
                                                            key={`detail-skeleton-${repo.id}-${index}`}
                                                        >
                                                            <span className={`${styles.skeleton} ${styles.detailSkeletonLabel}`} />
                                                            <span className={`${styles.skeleton} ${styles.detailSkeletonValue}`} />
                                                            <span className={`${styles.skeleton} ${styles.detailSkeletonMeta}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className={styles.detailReadme}>
                                                    <span className={`${styles.skeleton} ${styles.detailSkeletonLine}`} />
                                                    <span className={`${styles.skeleton} ${styles.detailSkeletonLine}`} />
                                                    <span className={`${styles.skeleton} ${styles.detailSkeletonLineShort}`} />
                                                </div>
                                                <div className={styles.detailActions}>
                                                    {Array.from({length: 3}).map((_, index) => (
                                                        <span
                                                            className={`${styles.skeleton} ${styles.detailSkeletonPill}`}
                                                            key={`detail-pill-${repo.id}-${index}`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={styles.detailGrid}>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Pipeline</span>
                                                        {pipelineStatus?.runUrl ? (
                                                            <a
                                                                href={pipelineStatus.runUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={styles.detailLink}
                                                            >
                                                                {pipelineDetailLabel}
                                                            </a>
                                                        ) : (
                                                            <span className={styles.detailValue}>{pipelineDetailLabel}</span>
                                                        )}
                                                        <span className={styles.detailMeta}>
                                                            {pipelineUpdatedAt
                                                                ? <DateStamp dateString={pipelineUpdatedAt} />
                                                                : 'No workflow run'}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Activity</span>
                                                        <span className={styles.detailValue}>
                                                            Last push <DateStamp dateString={repo.pushed_at} />
                                                        </span>
                                                        <span className={styles.detailMeta}>
                                                            {repo.language ?? 'No primary language'}
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Issues + PRs</span>
                                                        <span className={styles.detailValue}>
                                                            {openIssues ?? 'n/a'} issues
                                                        </span>
                                                        <span className={styles.detailMeta}>
                                                            {openPulls ?? 'n/a'} open PRs
                                                        </span>
                                                    </div>
                                                    <div className={styles.detailItem}>
                                                        <span className={styles.detailLabel}>Latest release</span>
                                                        {latestRelease ? (
                                                            <a
                                                                href={latestRelease.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className={styles.detailLink}
                                                            >
                                                                {latestRelease.tag}
                                                            </a>
                                                        ) : (
                                                            <span className={styles.detailValue}>No releases</span>
                                                        )}
                                                        <span className={styles.detailMeta}>
                                                            {latestRelease?.publishedAt
                                                                ? <DateStamp dateString={latestRelease.publishedAt} />
                                                                : '---'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div
                                                    className={styles.detailReadme}
                                                    data-truncated={readme?.truncated ? 'true' : undefined}
                                                >
                                                    <span className={styles.detailLabel}>Readme snapshot</span>
                                                    {readme?.contentHtml ? (
                                                        <div
                                                            className={styles.detailReadmeContent}
                                                            dangerouslySetInnerHTML={{__html: readme.contentHtml}}
                                                        />
                                                    ) : (
                                                        <p className={styles.detailMuted}>No readme captured.</p>
                                                    )}
                                                    <a
                                                        href={repoReadmeUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={styles.detailLink}
                                                    >
                                                        View README
                                                    </a>
                                                </div>
                                                {pipelineNote && (
                                                    <p className={styles.detailNote}>{pipelineNote}</p>
                                                )}
                                                {isDetailError && (
                                                    <p className={styles.detailError}>
                                                        Details unavailable. {detailPayload?.error ?? 'Try again later.'}
                                                    </p>
                                                )}
                                                {rateLimitedUntil && (
                                                    <p className={styles.detailError}>
                                                        Rate limited until <DateStamp dateString={rateLimitedUntil} />.
                                                    </p>
                                                )}
                                                <div className={styles.detailActions}>
                                                    <a
                                                        href={repoReadmeUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        Readme
                                                    </a>
                                                    <a
                                                        href={repoIssuesUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        Issues
                                                    </a>
                                                    <a
                                                        href={repoPullsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        PRs
                                                    </a>
                                                    <a
                                                        href={repoReleasesUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className={`${styles.detailAction} glowable`}
                                                    >
                                                        Releases
                                                    </a>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <div className={styles.statsRow}>
                                        <span>{repo.stargazers_count} stars</span>
                                        <span>{repo.forks_count} forks</span>
                                        <span>
                                            Active <DateStamp dateString={repo.pushed_at}/>
                                        </span>
                                        <span className={`${styles.pipelineStatus} ${pipelineClassName}`}>
                                            <span className={styles.pipelineDot} data-state={pipelineState} />
                                            {pipelineLabel}
                                        </span>
                                    </div>
                                    <div className={styles.linksRow}>
                                        {links.map((link) => (
                                            <a
                                                className={`${styles.linkButton} glowable`}
                                                key={link.label}
                                                href={link.url}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {link.label}
                                            </a>
                                        ))}
                                    </div>
                                    <RelatedPosts
                                        posts={relatedPosts}
                                        label="Related posts"
                                        classes={{
                                            details: styles.relatedPosts,
                                            summary: styles.relatedLabel,
                                            content: styles.relatedContent,
                                            contentInner: styles.relatedContentInner,
                                            list: styles.relatedList,
                                        }}
                                    />
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
            <section className={styles.postsSection}>
                <h2 className={styles.postsTitle}>Project tagged posts</h2>
                {projectPosts.length > 0 ? (
                    <PostSummaries postSummaries={projectPosts}/>
                ) : (
                    <div className={styles.emptyState}>
                        <p>
                            No posts tagged with project primary tags yet. Add project tags to post frontmatter to
                            surface them here.
                        </p>
                    </div>
                )}
            </section>
        </Layout>
    );
}

export const getStaticProps: GetStaticProps<ProjectsProps> = async () => {
    const [{repos, error}, allPosts] = await Promise.all([
        getActiveRepos({
            username: GITHUB_USERNAME,
            lookbackDays: PROJECT_ACTIVITY_DAYS,
        }),
        getSortedPostsData(),
    ]);

    const metaMap = new Map<string, ProjectMeta>(
        PROJECT_OVERRIDES.map((meta) => [meta.repo.toLowerCase(), meta])
    );

    const projects = repos
        .map((repo) => {
            const meta = metaMap.get(repo.name.toLowerCase());
            return {
                repo,
                meta: meta ?? null,
                relatedPosts: getRelatedPosts(allPosts, meta, repo.topics ?? []),
            };
        })
        .sort((a, b) => {
            const aFeatured = a.meta?.featured ? 1 : 0;
            const bFeatured = b.meta?.featured ? 1 : 0;
            if (aFeatured !== bFeatured) return bFeatured - aFeatured;
            return a.repo.pushed_at < b.repo.pushed_at ? 1 : -1;
        });

    const projectPrimaryTags = Array.from(
        new Set(
            projects
                .map((project) => project.meta?.primaryTag)
                .filter((tag): tag is string => Boolean(tag))
        )
    );

    const projectPosts = projectPrimaryTags.length === 0
        ? []
        : matchPostsByTags(allPosts, projectPrimaryTags);

    return {
        props: {
            projects,
            githubError: error,
            projectPosts,
        },
        revalidate: 86400,
    };
};
