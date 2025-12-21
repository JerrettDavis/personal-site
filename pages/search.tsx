import Head from "next/head";
import Layout from "../components/layout";
import styles from "./search.module.css";
import {useMemo, useState} from "react";
import {GetStaticProps} from "next";
import {getSortedPostsData, PostSummary} from "../lib/posts";
import {NAV_ITEMS, NavItem} from "../data/nav";
import Link from "next/link";

interface PageResult {
    label: string;
    href: string;
    description: string;
    keywords: string[];
}

interface PostResult {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    categories: string[];
    date: string;
}

interface SearchProps {
    pages: PageResult[];
    posts: PostResult[];
}

const buildPageResults = (items: NavItem[]): PageResult[] =>
    items.map((item) => ({
        label: item.label,
        href: item.href,
        description: item.description ?? '',
        keywords: item.keywords ?? [],
    }));

const buildPostResults = (posts: PostSummary[]): PostResult[] =>
    posts.map((post) => ({
        id: post.id,
        title: post.title,
        summary: (post.description && post.description.trim().length > 0) ? post.description : post.stub,
        tags: post.tags ?? [],
        categories: post.categories ?? [],
        date: post.date,
    }));

const normalize = (value: string) => value.trim().toLowerCase();

const matchesQuery = (query: string, fields: string[]) => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return false;
    return fields.some((field) => normalize(field).includes(normalizedQuery));
};

export default function Search({pages, posts}: SearchProps) {
    const [query, setQuery] = useState('');
    const lede = 'Search across the blog and the main site without leaving the page.';

    const {pageResults, postResults} = useMemo(() => {
        if (!query.trim()) {
            return {
                pageResults: [],
                postResults: [],
            };
        }

        const filteredPages = pages.filter((page) =>
            matchesQuery(query, [page.label, page.description, ...page.keywords])
        );

        const filteredPosts = posts.filter((post) =>
            matchesQuery(query, [
                post.title,
                post.summary,
                ...post.tags,
                ...post.categories,
            ])
        );

        return {
            pageResults: filteredPages,
            postResults: filteredPosts,
        };
    }, [pages, posts, query]);

    const totalResults = pageResults.length + postResults.length;

    return (
        <Layout description={lede}>
            <Head>
                <title>Search - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Search</p>
                <h1 className={styles.title}>Find posts, pages, and topics</h1>
                <p className={styles.lede}>
                    {lede}
                </p>
            </section>
            <section className={styles.searchPanel}>
                <label className={styles.searchLabel} htmlFor="site-search">
                    Search
                </label>
                <input
                    id="site-search"
                    className={styles.searchInput}
                    type="search"
                    placeholder="Search posts, tags, projects, and pages..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                {query.trim().length > 0 && (
                    <div className={styles.searchMeta}>
                        {totalResults} result{totalResults === 1 ? '' : 's'}
                    </div>
                )}
            </section>
            {query.trim().length === 0 ? (
                <div className={styles.emptyState}>
                    Start typing to search. Results update instantly as you type.
                </div>
            ) : (
                <section className={styles.resultsGrid}>
                    <div className={styles.resultsSection}>
                        <h2 className={styles.resultsTitle}>Pages</h2>
                        {pageResults.length > 0 ? (
                            <ul className={styles.resultsList}>
                                {pageResults.map((page) => (
                                    <li className={styles.resultCard} key={page.href}>
                                        <Link href={page.href} className={styles.resultLink}>
                                            {page.label}
                                        </Link>
                                        <p className={styles.resultSummary}>{page.description}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={styles.emptyResult}>No matching pages.</p>
                        )}
                    </div>
                    <div className={styles.resultsSection}>
                        <h2 className={styles.resultsTitle}>Blog posts</h2>
                        {postResults.length > 0 ? (
                            <ul className={styles.resultsList}>
                                {postResults.map((post) => (
                                    <li className={styles.resultCard} key={post.id}>
                                        <Link href={`/blog/posts/${post.id}`} className={styles.resultLink}>
                                            {post.title}
                                        </Link>
                                        <p className={styles.resultSummary}>{post.summary}</p>
                                        {post.tags.length > 0 && (
                                            <div className={styles.tagRow}>
                                                {post.tags.map((tag) => (
                                                    <span className={styles.tag} key={tag}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={styles.emptyResult}>No matching posts.</p>
                        )}
                    </div>
                </section>
            )}
        </Layout>
    );
}

export const getStaticProps: GetStaticProps<SearchProps> = async () => {
    const posts = await getSortedPostsData();
    return {
        props: {
            pages: buildPageResults(NAV_ITEMS),
            posts: buildPostResults(posts),
        },
    };
};
