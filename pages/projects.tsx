import Head from "next/head";
import Layout from "../components/layout";
import styles from "./projects.module.css";
import {GetStaticProps} from "next";
import {getActiveRepos, GitHubRepo} from "../lib/github";
import {GITHUB_USERNAME, PROJECT_ACTIVITY_DAYS, PROJECT_OVERRIDES} from "../data/projects";
import type {ProjectLink, ProjectMeta} from "../data/projects";
import Link from "next/link";
import Date from "../components/date";
import {getSortedPostsData} from "../lib/posts";
import type {PostSummary} from "../lib/posts";
import type {CSSProperties} from "react";
import PostSummaries from "../components/postSummaries";
import {matchPostsByTags} from "../lib/post-matching";

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
        {label: 'Active repos', value: projects.length},
        {label: 'Featured', value: featuredCount},
        {label: 'Stars', value: totalStars},
        {label: 'Latest push', value: latestPushedAt ? <Date dateString={latestPushedAt} /> : '---'},
    ];

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
                <div className={styles.statsGrid}>
                    {stats.map((stat) => (
                        <div className={`${styles.statCard} glowable`} key={stat.label}>
                            <div className={styles.statValue}>{stat.value}</div>
                            <div className={styles.statLabel}>{stat.label}</div>
                        </div>
                    ))}
                </div>
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
                <section className={styles.grid}>
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
                        const links = [
                            {label: 'GitHub', url: repo.html_url},
                            repo.homepage ? {label: 'Live', url: repo.homepage} : null,
                            ...(meta?.links ?? []),
                        ].filter((link): link is ProjectLink => Boolean(link));

                        const cardStyle = {
                            '--accent': meta?.accent ?? 'var(--color-primary)',
                        } as CSSProperties;

                        return (
                            <article
                                className={`${styles.projectCard} ${meta?.featured ? styles.projectCardFeatured : ''} glowable`}
                                style={cardStyle}
                                key={repo.id}
                            >
                                <div className={styles.cardBody}>
                                    <div className={styles.cardHeader}>
                                        <h2 className={styles.cardTitle}>
                                            <a href={repo.html_url} target="_blank" rel="noreferrer">
                                                {displayName}
                                            </a>
                                        </h2>
                                        {meta?.featured && <span className={styles.cardFlag}>Featured</span>}
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
                                <div className={styles.cardFooter}>
                                    <div className={styles.statsRow}>
                                        <span>{repo.stargazers_count} stars</span>
                                        <span>{repo.forks_count} forks</span>
                                        <span>
                                            Active <Date dateString={repo.pushed_at}/>
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
                                    {relatedPosts.length > 0 && (
                                        <details className={styles.relatedPosts}>
                                            <summary className={styles.relatedLabel}>
                                                Related posts ({relatedPosts.length})
                                            </summary>
                                            <div className={styles.relatedContent}>
                                                <div className={styles.relatedContentInner}>
                                                    <ul className={styles.relatedList}>
                                                        {relatedPosts.map((post) => (
                                                            <li key={post.id}>
                                                                <Link href={`/blog/posts/${post.id}`} className="glowable">
                                                                    {post.title}
                                                                </Link>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </details>
                                    )}
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
