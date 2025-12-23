import Layout from "../../components/layout";
import Head from "next/head";
import utilStyles from "../../styles/utils.module.css";
import Link from "next/link";
import {GetStaticProps} from "next";
import {getSortedPostsData} from "../../lib/posts";
import type {PostSummary} from "../../lib/posts";
import {POSTS_PER_PAGE} from "../../lib/blog-utils";
import {getSortedTagsData, TagData} from "../../lib/tags";
import {Category, getAllCategories} from "../../lib/categories";
import PostSummaries from "../../components/postSummaries";
import generateRssFeed from "../../utils/generateRSSFeed";
import styles from "./index.module.css";
import StatGrid from "../../components/statGrid";


export default function Index(
    {
        postSummaries,
        tags,
        categories,
        currentPage,
        totalPages,
        totalPosts,
    }: BlogIndexPropsModel) {
    const blogDescription = 'Developer blog exploring architecture, testing, and the occasional over-engineered experiment.';
    const titleSuffix = currentPage > 1 ? ` (Page ${currentPage})` : '';
    const stats = [
        {id: 'posts', label: 'Posts', value: totalPosts},
        {id: 'tags', label: 'Tags', value: tags?.length ?? 0},
        {id: 'categories', label: 'Categories', value: categories?.length ?? 0},
    ];
    return (
        <Layout description={blogDescription}>
            <Head>
                <title>the overengineer.{titleSuffix} - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Blog</p>
                <h1 className={styles.title}>the overengineer.</h1>
                <p className={styles.lede}>
                    I've been told I have a penchant for <em>occasionally</em> over-engineering solutions. On my
                    ever-present mission for improvement, that habit sometimes yields new and inventive ways to solve
                    challenges. More often than not, the result is affectionately described as <em>cursed</em>.
                </p>
                <p className={styles.lede}>
                    As a digital manifestation of "Misery loves company," this is where I document the experiments.
                    I also publish on <a href="https://hashnode.jerrettdavis.com" target="_blank" rel="noreferrer">Hashnode</a>.
                </p>
                <div className={styles.heroActions}>
                    <Link href="/search" className={`${styles.primaryLink} glowable`}>
                        Search posts
                    </Link>
                    <a href="/rss.xml" className={`${styles.secondaryLink} glowable`}>
                        RSS feed
                    </a>
                    <Link href="/blog/series" className={`${styles.secondaryLink} glowable`}>
                        Series
                    </Link>
                    <Link href="/projects" className={`${styles.secondaryLink} glowable`}>
                        Projects
                    </Link>
                </div>
                <StatGrid
                    items={stats}
                    gridClassName={styles.statsGrid}
                    itemClassName={styles.statCard}
                    valueClassName={styles.statValue}
                    labelClassName={styles.statLabel}
                />
            </section>

            <section className={styles.contentGrid}>
                <section className={styles.latest}>
                    <div className={styles.sectionHeader}>
                        <h2 className={utilStyles.headingLg}>Latest blog posts</h2>
                        <p className={styles.sectionLead}>
                            Recent writing, experiments, and lessons learned.
                        </p>
                    </div>
                    <PostSummaries postSummaries={postSummaries}/>
                    {totalPages > 1 && (
                        <nav className={styles.pagination} aria-label="Blog pagination">
                            <div className={styles.pageList}>
                                {Array.from({length: totalPages}).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const isActive = pageNumber === currentPage;
                                    const href = pageNumber === 1 ? '/blog' : `/blog/page/${pageNumber}`;
                                    return (
                                        <Link
                                            key={pageNumber}
                                            href={href}
                                            className={`${styles.pageLink} ${isActive ? styles.pageLinkActive : ''} glowable`}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            {pageNumber}
                                        </Link>
                                    );
                                })}
                            </div>
                        </nav>
                    )}
                </section>
                <aside className={styles.sidebar}>
                    {!!categories && createCategoriesIfPresent(categories)}
                    {!!tags && createTagsIfPresent(tags)}
                </aside>
            </section>
        </Layout>
    )
}

const createTagsIfPresent = (tags?: TagData[] | null | undefined) => {
    if (!!tags) {
        return (
            <div className={styles.sideCard}>
                <h2 className={styles.sideTitle}>Tags</h2>
                <div className={styles.tagCloud}>
                    {tags.map((tag) => (
                        <Link className={`${styles.tagChip} glowable`} href={`/blog/tags/${tag.tagName}`} key={tag.tagName}>
                            #{tag.tagName}
                        </Link>
                    ))}
                </div>
            </div>
        );
    } else {
        return <></>;
    }
}

const createCategoriesIfPresent = (categories?: Category[] | null | undefined) => {
    if (!!categories) {
        return (
            <div className={styles.sideCard}>
                <h2 className={styles.sideTitle}>Categories</h2>
                <ul className={styles.categoryList}>
                    {categories.map((category) => (
                        <li className={styles.categoryItem} key={category.categoryName}>
                            <Link href={`/blog/categories/${category.categoryPath}`} className={`${styles.categoryLink} glowable`}>
                                <span>{category.categoryName}</span>
                                <span className={styles.categoryCount}>{category.count}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        );
    } else {
        return <></>;
    }
}

export interface BlogIndexPropsModel {
    postSummaries: PostSummary[],
    tags: TagData[],
    categories: Category[],
    currentPage: number,
    totalPages: number,
    totalPosts: number,
}

type BlogIndexProps = BlogIndexPropsModel;


export const getStaticProps: GetStaticProps<BlogIndexPropsModel> = async (): Promise<{ props: BlogIndexPropsModel }> => {
    const allPosts = await getSortedPostsData();
    const tags = await getSortedTagsData();
    const categories = await getAllCategories();
    const totalPosts = allPosts.length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
    const postSummaries = allPosts.slice(0, POSTS_PER_PAGE);
    await generateRssFeed();
    return {
        props: {
            postSummaries,
            tags,
            categories,
            currentPage: 1,
            totalPages,
            totalPosts,
        }
    };
}
