import Head from 'next/head'
import Image from 'next/image'
import styles from './layout.module.css'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons'

const name = 'Jerrett Davis'
export const siteTitle = 'My Slice of the Internet'

export default function Layout({
       children,
       home
   }: {
    children: React.ReactNode
    home?: boolean
}) {
    return (
        <div className={styles.container}>
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
            <header className={styles.header}>
                {home ? (
                    <>
                        <Link href="/about-me">
                            <a>
                                <div className={styles.profileContainer}>
                                    <Image
                                        priority
                                        src="/images/profile.png"
                                        className={`${utilStyles.borderCircle} ${styles.profilePic}`}
                                        height={144}
                                        width={144}
                                        alt={name}
                                    />
                                </div>
                            </a>
                        </Link>
                        <h1 className={utilStyles.heading2Xl}>{name}</h1>
                        <div className={styles.largeSocialRow}>
                            <a href="https://github.com/jerrettdavis" target="_blank">
                                <div className={styles.socialIcon}>
                                    <FontAwesomeIcon icon={faGithub} />
                                </div>
                            </a>
                            <a href="https://www.linkedin.com/in/jddpro/" target="_blank">
                                <div className={styles.socialIcon}>
                                    <FontAwesomeIcon icon={faLinkedin} />
                                </div>
                            </a>
                        </div>
                    </>
                ) : (
                    <>
                        <Link href="/">
                            <a>
                                <Image
                                    priority
                                    src="/images/profile.png"
                                    className={utilStyles.borderCircle}
                                    height={108}
                                    width={108}
                                    alt={name}
                                />
                            </a>
                        </Link>
                        <h2 className={utilStyles.headingLg}>
                            <Link href="/">
                                <a className={utilStyles.colorInherit}>{name}</a>
                            </Link>
                        </h2>
                    </>
                )}
            </header>
            <main>{children}</main>
            {!home && (
                <div className={styles.backToHome}>
                    <Link href="/">
                        <a>← Back to home</a>
                    </Link>
                </div>
            )}
        </div>
    )
}

