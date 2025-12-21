import Head from 'next/head'
import Layout, {PageType} from '../components/layout'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import styles from "../components/layout.module.css";
import Image from "next/image";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBluesky, faGithub, faLinkedin, faMastodon} from "@fortawesome/free-brands-svg-icons";

export default function Home() {
    const introSentence = 'Hello! I\'m Jerrett, but everyone just calls me JD. I like to write code and occasionally ramble about stuff.';
    return (
        <Layout pageType={PageType.Home} description={introSentence}>
            <Head>
                <title>Jerrett Davis - The Overengineer</title>
            </Head>
            <header className={styles.header}>
                <Link href="/about-me" title="Go to my About Me page" aria-label="Go to my About Me page">
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
                </Link>
                <h1 className={utilStyles.heading2Xl}>Jerrett Davis</h1>
                <div className={styles.largeSocialRow}>
                    <a href="https://github.com/jerrettdavis"
                       target="_blank"
                       rel="noreferrer"
                       title="My Github page"
                       aria-label="Go to my Github page"
                    >
                        <div className={styles.socialIcon}>
                            <FontAwesomeIcon icon={faGithub}/>
                        </div>
                    </a>
                    <a href="https://bsky.app/profile/jerrett.dev"
                       target="_blank"
                       rel="noreferrer"
                       title="My Bluesky profile"
                       aria-label="Go to my Bluesky profile"
                    >
                        <div className={styles.socialIcon}>
                            <FontAwesomeIcon icon={faBluesky}/>
                        </div>
                    </a>
                    <a href="https://mastodon.social/@JerrettDavis"
                       target="_blank"
                       rel="noreferrer"
                       title="My Mastodon.Social page"
                       aria-label="Go to my Mastodon.Social page"
                    >
                        <div className={styles.socialIcon}>
                            <FontAwesomeIcon icon={faMastodon}/>
                        </div>
                    </a>
                    <a href="https://www.linkedin.com/in/jddpro/"
                       target="_blank"
                       rel="noreferrer"
                       title="My LinkedIn page"
                       aria-label="Go to my LinkedIn page"
                    >
                        <div className={styles.socialIcon}>
                            <FontAwesomeIcon icon={faLinkedin}/>
                        </div>
                    </a>
                </div>
            </header>
            <section className={utilStyles.headingMd}>
                <p>
                    {introSentence}{' '}
                    You can read more <Link href="/about-me">about me here.</Link> I've also been working on a <Link
                    href="/blog">blog</Link>!
                </p>
            </section>
        </Layout>
    )
}

export default interface BaseProps<TModel> {
    props: TModel
}
