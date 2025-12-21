import {GetStaticPaths, GetStaticProps} from "next";
import Head from "next/head";
import Link from "next/link";
import Layout, {PageType} from "../../../components/layout";
import utilStyles from "../../../styles/utils.module.css";
import PostSummaries from "../../../components/postSummaries";
import {getAllSeriesSummaries, getSeriesDataBySlug} from "../../../lib/posts";
import type {PostSummary} from "../../../lib/posts";
import {getSortedTagsData, TagData} from "../../../lib/tags";
import {Category, getAllCategories} from "../../../lib/categories";
import styles from "../listing.module.css";

export default function SeriesDetail({
    series,
    tags,
    categories,
}: {
    series: { name: string; posts: PostSummary[] }
    tags: TagData[]
    categories: Category[]
}) {
    const postCount = series.posts.length;
    const description = `Posts in the ${series.name} series on the overengineer blog.`;
    return (
        <Layout pageType={PageType.BlogPost} description={description}>
            <Head>
                <title>{series.name} series - the overengineer. - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Series</p>
                <h1 className={styles.title}>{series.name}</h1>
                <p className={styles.lede}>
                    {postCount} post{postCount === 1 ? '' : 's'} exploring a shared thread.
                </p>
                <div className={styles.heroActions}>
                    <Link href="/blog" className={styles.primaryLink}>
                        Back to blog
                    </Link>
                    <Link href="/blog/series" className={styles.secondaryLink}>
                        All series
                    </Link>
                </div>
                <div className={styles.heroMeta}>
                    <span className={styles.heroMetaLabel}>Posts</span>
                    <span className={styles.heroBadge}>{postCount}</span>
                </div>
            </section>
            <section className={styles.contentGrid}>
                <section>
                    <div className={styles.sectionHeader}>
                        <h2 className={utilStyles.headingLg}>Series posts</h2>
                        <p className={styles.sectionLead}>
                            Start at the top and follow along.
                        </p>
                    </div>
                    <PostSummaries postSummaries={series.posts}/>
                </section>
                <aside className={styles.sidebar}>
                    {categories && categories.length > 0 && (
                        <div className={styles.sideCard}>
                            <h2 className={styles.sideTitle}>Categories</h2>
                            <ul className={styles.categoryList}>
                                {categories.map((category) => (
                                    <li className={styles.categoryItem} key={category.categoryName}>
                                        <Link href={`/blog/categories/${category.categoryPath}`} className={styles.categoryLink}>
                                            <span>{category.categoryName}</span>
                                            <span className={styles.categoryCount}>{category.count}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {tags && tags.length > 0 && (
                        <div className={styles.sideCard}>
                            <h2 className={styles.sideTitle}>Tags</h2>
                            <div className={styles.tagCloud}>
                                {tags.map((tag) => (
                                    <Link className={styles.tagChip} href={`/blog/tags/${tag.tagName}`} key={tag.tagName}>
                                        #{tag.tagName}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </section>
        </Layout>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const series = await getAllSeriesSummaries();
    return {
        paths: series.map((entry) => ({params: {series: entry.slug}})),
        fallback: false
    };
};

export const getStaticProps: GetStaticProps = async ({params}) => {
    const slugParam = Array.isArray(params?.series) ? params?.series[0] : params?.series;
    if (!slugParam || typeof slugParam !== 'string') {
        return {notFound: true};
    }

    const [series, tags, categories] = await Promise.all([
        getSeriesDataBySlug(slugParam),
        getSortedTagsData(),
        getAllCategories(),
    ]);
    if (!series) {
        return {notFound: true};
    }

    return {
        props: {
            series,
            tags,
            categories,
        }
    };
};
