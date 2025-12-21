import Head from "next/head";
import Layout from "../components/layout";
import styles from "./hobbies.module.css";
import {GetStaticProps} from "next";
import {HOBBIES} from "../data/hobbies";
import type {HobbyBlurb} from "../data/hobbies";
import {getPostsForTags} from "../lib/tags";
import {PostSummary} from "../lib/posts";
import PostSummaries from "../components/postSummaries";

interface HobbiesProps {
    hobbies: HobbyBlurb[];
    hobbyPosts: PostSummary[];
}

export default function Hobbies({hobbies, hobbyPosts}: HobbiesProps) {
    const lede = 'When I am not building software, I am usually making something physical, experimental, or just strangely cozy.';
    return (
        <Layout description={lede}>
            <Head>
                <title>Hobbies - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Hobbies</p>
                <h1 className={styles.title}>The off-hours obsession list</h1>
                <p className={styles.lede}>
                    {lede}
                </p>
            </section>
            <section className={styles.hobbyGrid}>
                {hobbies.map((hobby) => (
                    <article className={styles.hobbyCard} key={hobby.title}>
                        <h2 className={styles.hobbyTitle}>{hobby.title}</h2>
                        <p className={styles.hobbySummary}>{hobby.summary}</p>
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
                            No posts tagged <strong>hobby</strong> or <strong>hobbies</strong> yet. Add either tag to a
                            post frontmatter to surface it here.
                        </p>
                    </div>
                )}
            </section>
        </Layout>
    );
}

export const getStaticProps: GetStaticProps<HobbiesProps> = async () => {
    const hobbyPosts = await getPostsForTags(['hobby', 'hobbies']);
    return {
        props: {
            hobbies: HOBBIES,
            hobbyPosts,
        },
    };
};
