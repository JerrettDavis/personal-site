import {GetStaticPaths, GetStaticProps} from "next";
import {PostSummary} from "../../../lib/posts";
import Layout, {PageType} from "../../../components/layout";
import Head from "next/head";
import utilStyles from "../../../styles/utils.module.css";
import Link from "next/link";
import {Category, getAllCategories, getCategoryData, getPostsForCategory} from "../../../lib/categories";
import PostSummaries from "../../../components/postSummaries";
import styles from "../listing.module.css";
import {getSortedTagsData, TagData} from "../../../lib/tags";

export default function PostCategory(
    {
        categoryData,
        postData,
        tags,
        categories,
    }: {
        categoryData: Category,
        postData: PostSummary[]
        tags: TagData[]
        categories: Category[]
    }) {
    const shortName = categoryData.categoryName.split('/').pop();
    const title = `Posts in ${shortName} - the overengineer. - Jerrett Davis`;
    const description = `Most recent posts in the ${shortName} category on the overengineer blog.`;
    return (
        <Layout pageType={PageType.BlogPost} description={description}>
            <Head>
                <title>{title}</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Category</p>
                <h1 className={styles.title}>{shortName}</h1>
                <p className={styles.lede}>
                    Posts filed under <strong>{shortName}</strong>.
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
                            {postData.length} post{postData.length === 1 ? '' : 's'} in {shortName}.
                        </p>
                    </div>
                    <PostSummaries postSummaries={postData}/>
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
    )
}


export const getStaticPaths: GetStaticPaths = async () => {
    const paths = (await getAllCategories())
        .map(p => {
            return {
                params: {
                    category: p.categoryPath.split('/')
                }
            }
        });

    return {
        paths,
        fallback: false
    }
}

export const getStaticProps: GetStaticProps = async ({params}) => {
    const [postData, categoryData, tags, categories] = await Promise.all([
        getPostsForCategory((params.category as string[]).join('/')),
        getCategoryData((params.category as string[]).join('/')),
        getSortedTagsData(),
        getAllCategories(),
    ]);
    return {
        props: {
            categoryData: categoryData,
            postData: postData,
            tags,
            categories,
        }
    }
}
