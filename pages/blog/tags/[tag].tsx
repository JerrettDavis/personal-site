import {GetStaticPaths, GetStaticProps} from "next";
import type {PostSummary} from "../../../lib/posts";
import {getAllTagIds, getPostsForTag} from "../../../lib/tags";
import Layout, {PageType} from "../../../components/layout";
import Head from "next/head";
import utilStyles from "../../../styles/utils.module.css";
import PostSummaries from "../../../components/postSummaries";
import styles from "../listing.module.css";
import Link from "next/link";
import {getSortedTagsData, TagData} from "../../../lib/tags";
import {Category, getAllCategories} from "../../../lib/categories";


export default function PostTag({
                                    tag,
                                    postData,
                                    tags,
                                    categories,
                                }: {
    tag: string,
    postData: PostSummary[]
    tags: TagData[]
    categories: Category[]
}) {
    const description = `Posts tagged with #${tag} on the overengineer blog.`;
    return (
        <Layout pageType={PageType.BlogPost} description={description}>
            <Head>
                <title>{`Posts tagged with #${tag} - the overengineer. - Jerrett Davis`}</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Tag</p>
                <h1 className={styles.title}>#{tag}</h1>
                <p className={styles.lede}>
                    Posts and experiments tagged with <strong>#{tag}</strong>.
                </p>
                <div className={styles.heroActions}>
                    <Link href="/blog" className={styles.primaryLink}>
                        Back to blog
                    </Link>
                    <Link href="/search" className={styles.secondaryLink}>
                        Search posts
                    </Link>
                </div>
            </section>
            <section className={styles.contentGrid}>
                <section>
                    <div className={styles.sectionHeader}>
                        <h2 className={utilStyles.headingLg}>Most recent posts</h2>
                        <p className={styles.sectionLead}>
                            {postData.length} post{postData.length === 1 ? '' : 's'} tagged #{tag}.
                        </p>
                    </div>
                    <PostSummaries postSummaries={postData} selectedTag={tag}/>
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
                                {tags.map((t) => (
                                    <Link className={styles.tagChip} href={`/blog/tags/${t.tagName}`} key={t.tagName}>
                                        #{t.tagName}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </section>
        </Layout>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const paths = await getAllTagIds()
    return {
        paths,
        fallback: false
    }
}

export const getStaticProps: GetStaticProps = async ({params}) => {
    const [postData, tags, categories] = await Promise.all([
        getPostsForTag(params.tag as string),
        getSortedTagsData(),
        getAllCategories(),
    ]);
    return {
        props: {
            tag: params.tag,
            postData,
            tags,
            categories,
        }
    }
}
