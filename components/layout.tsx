import Head from 'next/head'
import styles from './layout.module.css'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faGithub, faLinkedin} from '@fortawesome/free-brands-svg-icons'
import dynamic from "next/dynamic";

const name = 'Jerrett Davis'
export const siteTitle = 'My Slice of the Internet'

export enum PageType {
    Home,
    BlogPost
}

const ThemeToggle = dynamic(() => import('../components/themeToggle'), {
    ssr: false,
});

const HomeLink = () => (
    <div className={styles.backTo}>
        <Link href="/">
            <a>← Back to home</a>
        </Link>
    </div>
);

const BlogLink = () => (
    <div className={styles.backTo}>
        <Link href="/blog">
            <a>← Back to blog</a>
        </Link>
    </div>
);

const GoBackToLink = (props) => {
    if (props.pageType == PageType.Home)
        return (<></>);
    if (props.pageType == PageType.BlogPost)
        return (<BlogLink />);
    return (<HomeLink />);
};

export default function Layout({
       children,
       pageType
   }: {
    children: React.ReactNode
    pageType?: PageType
}) {
    return (
        <div>
            <Head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <link rel="manifest" href="/site.webmanifest" />
                <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2568ff" />
                <meta name="msapplication-TileColor" content="#2568ff" />
                <meta name="theme-color" content="#fdfdfd" />
                 <meta
                     name="description"
                     content="A portal to my personal and professional work, musings, and general junk!"
                 />
                <meta
                    property="og:image"
                    content={`https://og-image.vercel.app/${encodeURI(
                        siteTitle
                    )}.png?theme=dark&md=0&fontSize=75px&images=https%3A%2F%2Fassets.zeit.co%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fnextjs-black-logo.svg`}
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
                 <GoBackToLink pageType={pageType}  />
            </div>

        </div>
    )
}

