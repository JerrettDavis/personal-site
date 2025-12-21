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

interface ProjectCard {
    repo: GitHubRepo;
    meta: ProjectMeta | null;
    relatedPosts: PostSummary[];
}

interface ProjectsProps {
    projects: ProjectCard[];
    githubError: string | null;
}

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

const getRelatedPosts = (posts: PostSummary[], meta?: ProjectMeta | null): PostSummary[] => {
    if (!meta) return [];
    const related = new Map<string, PostSummary>();

    if (meta.relatedPosts?.length) {
        meta.relatedPosts.forEach((id: string) => {
            const post = posts.find((p) => p.id === id);
            if (post) related.set(post.id, post);
        });
    }

    if (meta.relatedTags?.length) {
        const tagSet = new Set(meta.relatedTags.map(normalizeTag));
        posts.forEach((post) => {
            if (post.tags?.some((tag: string) => tagSet.has(normalizeTag(tag)))) {
                related.set(post.id, post);
            }
        });
    }

    return Array.from(related.values()).slice(0, 3);
};

export default function Projects({projects, githubError}: ProjectsProps) {
    const isDev = process.env.NODE_ENV === 'development';
    const errorSummary = isDev ? githubError : 'GitHub data is temporarily unavailable.';
    const lede = 'Everything here has seen GitHub activity in the last year. Each card blends stats with my own notes, topics, and relevant writing.';
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
                        const topics = meta?.topics ?? [];
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
                                className={`${styles.projectCard} ${meta?.featured ? styles.projectCardFeatured : ''}`}
                                style={cardStyle}
                                key={repo.id}
                            >
                                <div className={styles.cardHeader}>
                                    <h2 className={styles.cardTitle}>
                                        <a href={repo.html_url} target="_blank" rel="noreferrer">
                                            {displayName}
                                        </a>
                                    </h2>
                                    {meta?.featured && <span className={styles.cardFlag}>Featured</span>}
                                </div>
                                <p className={styles.cardSummary}>{summary}</p>
                                <div className={styles.badgeRow}>
                                    {repo.language && <span className={styles.badge}>{repo.language}</span>}
                                    {topics.map((topic) => (
                                        <span className={styles.badge} key={topic}>
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                                {meta?.highlights?.length ? (
                                    <ul className={styles.highlightList}>
                                        {meta.highlights.map((highlight) => (
                                            <li key={highlight}>{highlight}</li>
                                        ))}
                                    </ul>
                                ) : null}
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
                                            className={styles.linkButton}
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
                                    <div className={styles.relatedPosts}>
                                        <span className={styles.relatedLabel}>Related posts</span>
                                        <ul className={styles.relatedList}>
                                            {relatedPosts.map((post) => (
                                                <li key={post.id}>
                                                    <Link href={`/blog/posts/${post.id}`}>{post.title}</Link>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </article>
                        );
                    })}
                </section>
            )}
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
                relatedPosts: getRelatedPosts(allPosts, meta),
            };
        })
        .sort((a, b) => {
            const aFeatured = a.meta?.featured ? 1 : 0;
            const bFeatured = b.meta?.featured ? 1 : 0;
            if (aFeatured !== bFeatured) return bFeatured - aFeatured;
            return a.repo.pushed_at < b.repo.pushed_at ? 1 : -1;
        });

    return {
        props: {
            projects,
            githubError: error,
        },
        revalidate: 86400,
    };
};
