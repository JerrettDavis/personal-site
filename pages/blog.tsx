import Layout from "../components/layout";
import Head from "next/head";
import utilStyles from "../styles/utils.module.css";
import Link from "next/link";
import Date from "../components/date";
import {GetStaticProps} from "next";
import {getSortedPostsData} from "../lib/posts";

export default function Blog({
         allPostsData
     }: {
    allPostsData: {
        date: string
        title: string
        id: string
    }[]
}) {
    return (
        <Layout>
            <Head>
                <title>the overengineer. - Jerrett Davis</title>
            </Head>
            <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
                <h1>the overengineer.</h1>
                <section>
                    <p>
                        I've been told I have a penchant for <em>occasionally</em> over-engineering solutions to certain problems.
                        On my ever-present mission for improvement, my struggles sometimes breathe life into new, inventive ways to
                        solve challenges. However, more often than not, I'm left with something many friends have affectionately
                        described as <em>cursed</em>.
                    </p>
                    <p>
                        As an exercise in self-reflection and as a digital manifestation of the idiom <em>"Misery loves company"</em>,
                        I present my developer blog: <strong>the overengineer.</strong>
                    </p>
                    <p>
                        I also publish my posts on <a href="https://hashnode.jerrettdavis.com">Hashnode</a>.
                    </p>
                </section>
                <hr />
                <section>
                    <h2 className={utilStyles.headingLg}>Latest Blog Posts</h2>
                    <ul className={utilStyles.list}>
                        {allPostsData.map(({ id, date, title }) => (
                            <li className={utilStyles.listItem} key={id}>
                                <Link href={`/posts/${id}`}>
                                    {title}
                                </Link>
                                <br />
                                <small className={utilStyles.lightText}>
                                    <Date dateString={date} />
                                </small>
                            </li>
                        ))}
                    </ul>
                </section>
            </section>
        </Layout>
    )
}

export const getStaticProps: GetStaticProps = async () => {
    const allPostsData = getSortedPostsData()
    return {
        props: {
            allPostsData
        }
    }
}
