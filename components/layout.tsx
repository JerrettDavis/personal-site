import Head from 'next/head'
import styles from './layout.module.css'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faGithub, faLinkedin} from '@fortawesome/free-brands-svg-icons'
import dynamic from "next/dynamic";

const name = 'Jerrett Davis'
export const siteTitle = 'My Slice of the Internet'

const ThemeToggle = dynamic(() => import('../components/themeToggle'), {
    ssr: false,
});

export default function Layout({
       children,
       home
   }: {
    children: React.ReactNode
    home?: boolean
}) {
    return (
        <div>
            <Head>
                <link rel="icon" href="/favicon.ico" />
                 <meta
                     name="description"
                     content="A portal to my personal and professional work, musings, and general junk!"
                 />
                <meta
                    property="og:image"
                    content={`https://og-image.vercel.app/${encodeURI(
                        siteTitle
                    )}.png?theme=light&md=0&fontSize=75px&images=https%3A%2F%2Fassets.zeit.co%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fnextjs-black-logo.svg`}
                />
                <meta name="og:title" content={siteTitle} />
                <meta name="twitter:card" content="summary_large_image" />
            </Head>
            <div className={styles.topActions}>
                <a href="https://github.com/jerrettdavis"
                   target="_blank"
                   title="My Github page"
                   aria-label="Go to my Github page"
                   className={styles.buttonLink}
                >
                    <FontAwesomeIcon icon={faGithub} />
                </a>
                <a href="https://www.linkedin.com/in/jddpro/"
                   target="_blank"
                   title="My LinkedIn page"
                   aria-label="Go to my LinkedIn page"
                   className={styles.buttonLink}
                >
                    <FontAwesomeIcon icon={faLinkedin}  />
                </a>
                <div className={utilStyles.marginLeft8}>
                    <ThemeToggle />
                </div>
            </div>
            <div className={styles.container}>
                <main>{children}</main>
                {!home && (
                    <div className={styles.backToHome}>
                        <Link href="/">
                            <a>← Back to home</a>
                        </Link>
                    </div>
                )}
            </div>

        </div>
    )
}

