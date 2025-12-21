import {GetStaticProps} from "next";
import Head from "next/head";
import Link from "next/link";
import Layout, {PageType} from "../../../components/layout";
import utilStyles from "../../../styles/utils.module.css";
import Date from "../../../components/date";
import {getAllSeriesSummaries} from "../../../lib/posts";
import type {SeriesSummary} from "../../../lib/posts";
import {getSortedTagsData, TagData} from "../../../lib/tags";
import {Category, getAllCategories} from "../../../lib/categories";
import styles from "../listing.module.css";

export default function SeriesIndex({
    series,
    tags,
    categories,
}: {
    series: SeriesSummary[]
    tags: TagData[]
    categories: Category[]
}) {
    const totalSeries = series.length;
    const description = 'Collections of related posts and multi-part deep dives from the overengineer blog.';
    return (
        <Layout pageType={PageType.BlogPost} description={description}>
            <Head>
                <title>Series - the overengineer. - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Series</p>
                <h1 className={styles.title}>Post series</h1>
                <p className={styles.lede}>
                    Multi-part explorations, experiments, and recurring threads across the blog.
                </p>
                <div className={styles.heroActions}>
                    <Link href="/blog" className={styles.primaryLink}>
                        Back to blog
                    </Link>
                    <Link href="/search" className={styles.secondaryLink}>
                        Search posts
                    </Link>
                </div>
                <div className={styles.heroMeta}>
                    <span className={styles.heroMetaLabel}>Series</span>
                    <span className={styles.heroBadge}>{totalSeries}</span>
                </div>
            </section>
            <section className={styles.contentGrid}>
                <section>
                    <div className={styles.sectionHeader}>
                        <h2 className={utilStyles.headingLg}>All series</h2>
                        <p className={styles.sectionLead}>
                            {totalSeries === 0
                                ? 'No series yet. Check back once a few multi-part posts land.'
                                : `${totalSeries} series and counting.`}
                        </p>
                    </div>
                    {totalSeries > 0 && (
                        <div className={styles.seriesGrid}>
                            {series.map((entry) => (
                                <Link
                                    href={`/blog/series/${entry.slug}`}
                                    className={styles.seriesCard}
                                    key={entry.slug}
                                >
                                    <span className={styles.seriesName}>{entry.name}</span>
                                    <span className={styles.seriesMetaRow}>
                                        <span className={styles.seriesMeta}>
                                            {entry.count} post{entry.count === 1 ? '' : 's'}
                                        </span>
                                        <span className={styles.seriesMeta}>
                                            Updated <Date dateString={entry.latestDate}/>
                                        </span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
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

export const getStaticProps: GetStaticProps = async () => {
    const [series, tags, categories] = await Promise.all([
        getAllSeriesSummaries(),
        getSortedTagsData(),
        getAllCategories(),
    ]);
    return {
        props: {
            series,
            tags,
            categories,
        }
    };
};
