import Head from 'next/head'
import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import {getSortedPostsData} from '../lib/posts'
import Link from 'next/link'
import Date from '../components/date'
import {GetStaticProps} from 'next'
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import('../components/themeToggle'), {
    ssr: false,
});

export default function Home({
         allPostsData
     }: {
    allPostsData: {
        date: string
        title: string
        id: string
    }[]
}) {
    return (
        <Layout home>
            <Head>
                <title>Jerrett Davis - The Overengineer</title>
            </Head>
            <section className={utilStyles.headingMd}>
                <p>
                    Hello! I'm Jerrett, but everyone just calls me JD. I like to write code and occasionally ramble about stuff.{' '}
                    <Link href="/about-me">More about me.</Link>
                </p>
            </section>
            <ThemeToggle />
            <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
                <h2 className={utilStyles.headingLg}>Blog</h2>
                <ul className={utilStyles.list}>
                    {allPostsData.map(({ id, date, title }) => (
                        <li className={utilStyles.listItem} key={id}>
                            <Link href={`/posts/${id}`}>
                                <a>{title}</a>
                            </Link>
                            <br />
                            <small className={utilStyles.lightText}>
                                <Date dateString={date} />
                            </small>
                        </li>
                    ))}
                </ul>
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
