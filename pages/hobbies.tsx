import Head from "next/head";
import Layout from "../components/layout";
import styles from "./hobbies.module.css";
import {GetStaticProps} from "next";
import {HOBBIES} from "../data/hobbies";
import type {HobbyBlurb} from "../data/hobbies";
import {getSortedPostsData} from "../lib/posts";
import type {PostSummary} from "../lib/posts";
import PostSummaries from "../components/postSummaries";
import Date from "../components/date";
import {matchPostsByTags} from "../lib/post-matching";
import StatGrid from "../components/statGrid";
import RelatedPosts from "../components/relatedPosts";

interface HobbiesProps {
    hobbies: HobbyBlurb[];
    hobbyPosts: PostSummary[];
    relatedPostsByHobby: Record<string, PostSummary[]>;
}

export default function Hobbies({hobbies, hobbyPosts, relatedPostsByHobby}: HobbiesProps) {
    const lede = 'When I am not building software, I am usually making something physical, experimental, or just strangely cozy.';
    const latestPostDate = hobbyPosts[0]?.date;
    const stats = [
        {id: 'count', label: 'Hobbies', value: hobbies.length},
        {id: 'posts', label: 'Tagged posts', value: hobbyPosts.length},
        {id: 'latest', label: 'Latest post', value: latestPostDate ? <Date dateString={latestPostDate} /> : 'None yet'},
    ];
    return (
        <Layout description={lede}>
            <Head>
                <title>Hobbies - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <div className={styles.heroCopy}>
                    <p className={styles.kicker}>Hobbies</p>
                    <h1 className={styles.title}>The off-hours obsession list</h1>
                    <p className={styles.lede}>
                        {lede}
                    </p>
                </div>
                <div className={`${styles.heroCard} glowable`}>
                    <div className={styles.heroCardHeader}>
                        <div>
                            <p className={styles.heroCardKicker}>Snapshot</p>
                            <h2 className={styles.heroCardTitle}>After-hours telemetry</h2>
                        </div>
                    </div>
                    <StatGrid
                        items={stats}
                        gridClassName={styles.statsGrid}
                        itemClassName={styles.statCard}
                        valueClassName={styles.statValue}
                        labelClassName={styles.statLabel}
                    />
                    <div className={styles.heroTags}>
                        <span className={styles.heroTag}>Hands-on</span>
                        <span className={styles.heroTag}>Creative</span>
                        <span className={styles.heroTag}>Tinker</span>
                    </div>
                </div>
            </section>
            <section className={styles.hobbyGrid}>
                {hobbies.map((hobby, index) => (
                    <article className={`${styles.hobbyCard} glowable`} key={hobby.title}>
                        <div className={styles.hobbyHeader}>
                            <span className={styles.hobbyIndex}>{String(index + 1).padStart(2, '0')}</span>
                            <h2 className={styles.hobbyTitle}>{hobby.title}</h2>
                        </div>
                        <p className={styles.hobbySummary}>{hobby.summary}</p>
                        <RelatedPosts
                            posts={relatedPostsByHobby[hobby.title] ?? []}
                            label="Related posts"
                            classes={{
                                details: styles.relatedPosts,
                                summary: styles.relatedSummary,
                                content: styles.relatedContent,
                                contentInner: styles.relatedContentInner,
                                list: styles.relatedList,
                            }}
                        />
                    </article>
                ))}
            </section>
            <section className={styles.postsSection}>
                <h2 className={styles.postsTitle}>Hobby tagged posts</h2>
                {hobbyPosts.length > 0 ? (
                    <PostSummaries postSummaries={hobbyPosts}/>
                ) : (
                    <div className={styles.emptyState}>
                        <p>
                            No posts tagged with the primary hobby tags yet. Add one of the hobby primary tags to a
                            post frontmatter entry to surface it here.
                        </p>
                    </div>
                )}
            </section>
        </Layout>
    );
}

export const getStaticProps: GetStaticProps<HobbiesProps> = async () => {
    const allPosts = await getSortedPostsData();
    const primaryTags = Array.from(new Set(HOBBIES.map((hobby) => hobby.primaryTag).filter(Boolean)));
    const hobbyPosts = matchPostsByTags(allPosts, primaryTags);
    const relatedPostsByHobby = HOBBIES.reduce<Record<string, PostSummary[]>>((acc, hobby) => {
        const tagSet = Array.from(new Set([hobby.primaryTag, ...hobby.tags].filter(Boolean)));
        const related = matchPostsByTags(allPosts, tagSet).slice(0, 3);
        acc[hobby.title] = related;
        return acc;
    }, {});
    return {
        props: {
            hobbies: HOBBIES,
            hobbyPosts,
            relatedPostsByHobby,
        },
    };
};
