import Head from 'next/head'
import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import {getSortedPostsData} from '../lib/posts'
import Link from 'next/link'
import {GetStaticProps} from 'next'
import dynamic from "next/dynamic";

const ThemeToggle = dynamic(() => import('../components/themeToggle'), {
    ssr: false,
});

export default function Home() {
    return (
        <Layout home>
            <Head>
                <title>Jerrett Davis - The Overengineer</title>
            </Head>
            <section className={utilStyles.headingMd}>
                <p>
                    Hello! I'm Jerrett, but everyone just calls me JD. I like to write code and occasionally ramble about stuff.{' '}
                    You can read more <Link href="/about-me">about me here.</Link>
                </p>
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
