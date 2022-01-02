import Head from 'next/head'
import Layout from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import {getSortedPostsData} from '../lib/posts'
import Link from 'next/link'
import {GetStaticProps} from 'next'
import dynamic from "next/dynamic";
import styles from "../components/layout.module.css";
import Image from "next/image";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faGithub, faLinkedin} from "@fortawesome/free-brands-svg-icons";

const ThemeToggle = dynamic(() => import('../components/themeToggle'), {
    ssr: false,
});

export default function Home() {
    return (
        <Layout home>
            <Head>
                <title>Jerrett Davis - The Overengineer</title>
            </Head>
            <header className={styles.header}>
                <Link href="/about-me">
                    <a title="Go to my About Me page" aria-label="Go to my About Me page">
                        <div className={styles.profileContainer}>
                            <Image
                                priority
                                src="/images/profile.png"
                                className={`${utilStyles.borderCircle} ${styles.profilePic}`}
                                height={144}
                                width={144}
                                alt={'Photo of Jerrett Davis'}
                            />
                        </div>
                    </a>
                </Link>
                <h1 className={utilStyles.heading2Xl}>Jerrett Davis</h1>
                <div className={styles.largeSocialRow}>
                    <a href="https://github.com/jerrettdavis"
                       target="_blank"
                       title="My Github page"
                       aria-label="Go to my Github page"
                    >
                        <div className={styles.socialIcon}>
                            <FontAwesomeIcon icon={faGithub} />
                        </div>
                    </a>
                    <a href="https://www.linkedin.com/in/jddpro/"
                       target="_blank"
                       title="My LinkedIn page"
                       aria-label="Go to my LinkedIn page"
                    >
                        <div className={styles.socialIcon}>
                            <FontAwesomeIcon icon={faLinkedin} />
                        </div>
                    </a>
                </div>
            </header>
            <section className={utilStyles.headingMd}>
                <p>
                    Hello! I'm Jerrett, but everyone just calls me JD. I like to write code and occasionally ramble about stuff.{' '}
                    You can read more <Link href="/about-me">about me here.</Link> I've also been working on a <Link href="/blog">blog</Link>!
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
