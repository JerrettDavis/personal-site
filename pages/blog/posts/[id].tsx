import Layout, {PageType} from '../../../components/layout'
import {getAllPostIds, getPostData, getSeriesDataForPost} from '../../../lib/posts'
import type PostData from '../../../lib/posts'
import type {SeriesData} from '../../../lib/posts'
import {toSeriesSlug} from '../../../lib/blog-utils'
import Head from 'next/head'
import Date from '../../../components/date'
import {GetStaticPaths, GetStaticProps} from 'next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faClock} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Image from "next/image";
import styles from "../post.module.css";

const author = 'Jerrett Davis';

const getReadingTime = (wordCount?: number) => {
    if (!wordCount || wordCount <= 0) return 1;
    return Math.max(1, Math.round(wordCount / 200));
};

export default function Post({
         postData,
         seriesData,
     }: {
    postData: PostData
    seriesData: SeriesData | null
}) {
    const previousPost = seriesData?.posts[seriesData.currentIndex - 1];
    const nextPost = seriesData?.posts[seriesData.currentIndex + 1];
    const description = (postData.description && postData.description.trim().length > 0)
        ? postData.description
        : postData.stub;
    const readingTime = getReadingTime(postData.wordCount);
    return (
        <Layout pageType={PageType.BlogPost} description={description}>
            <Head>
                <title>{postData.title}</title>
            </Head>
            <article className={styles.page}>
                <header className={styles.hero}>
                    <p className={styles.kicker}>Blog post</p>
                    <h1 className={styles.title}>{postData.title}</h1>
                    <p className={styles.subtitle}>{description}</p>
                    <div className={styles.heroActions}>
                        <Link href="/blog" className={`${styles.primaryLink} glowable`}>
                            Back to blog
                        </Link>
                        <Link href="/search" className={`${styles.secondaryLink} glowable`}>
                            Search posts
                        </Link>
                    </div>
                    <div className={styles.metaRow}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Author</span>
                            <span className={styles.metaValue}>{author}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Published</span>
                            <span className={styles.metaValue}>
                                <Date dateString={postData.date} />
                            </span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Word count</span>
                            <span className={styles.metaValue}>{postData.wordCount?.toLocaleString()}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Read time</span>
                            <span className={`${styles.metaValue} ${styles.readTime}`}>
                                <FontAwesomeIcon height={14} width={14} icon={faClock} />
                                {readingTime} min
                            </span>
                        </div>
                    </div>
                </header>
                {postData.featured && (
                    <Image
                        className={styles.featuredImage}
                        width={940}
                        height={470}
                        src={postData.featured}
                        alt={postData.title}
                    />
                )}
                <div className={styles.content} dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
                {seriesData && (
                    <section className={styles.seriesCard}>
                        <div className={styles.seriesTitle}>
                            Series:{' '}
                            <Link href={`/blog/series/${toSeriesSlug(seriesData.name)}`} className="glowable">
                                {seriesData.name}
                            </Link>{' '}
                            (Part {seriesData.currentIndex + 1} of {seriesData.posts.length})
                        </div>
                        <div className={styles.seriesNav}>
                            {previousPost && (
                                <Link href={`/blog/posts/${previousPost.id}`} className="glowable">
                                    Prev: {previousPost.title}
                                </Link>
                            )}
                            {nextPost && (
                                <Link href={`/blog/posts/${nextPost.id}`} className="glowable">
                                    Next: {nextPost.title}
                                </Link>
                            )}
                        </div>
                        <ol className={styles.seriesList}>
                            {seriesData.posts.map((post, index) => (
                                <li className={styles.seriesItem} key={post.id} data-active={index === seriesData.currentIndex}>
                                    <Link href={`/blog/posts/${post.id}`} className="glowable">
                                        {index + 1}. {post.title}
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
                {!!postData.tags && (
                    <div className={styles.tagRow}>
                        {postData.tags.map(t => (
                            <Link href={`/blog/tags/${t}`} key={t} className={`${styles.tagChip} glowable`}>
                                #{t}
                            </Link>
                        ))}
                    </div>
                )}
            </article>
        </Layout>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const paths = await getAllPostIds()
    return {
        paths,
        fallback: false
    }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const [postData, seriesData] = await Promise.all([
        getPostData(params.id as string),
        getSeriesDataForPost(params.id as string),
    ])
    return {
        props: {
            postData,
            seriesData: seriesData ?? null,
        }
    }
}
