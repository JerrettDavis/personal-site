import Head from 'next/head'
import styles from './layout.module.css'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faBluesky, faGithub, faLinkedin, faMastodon} from '@fortawesome/free-brands-svg-icons'
import dynamic from "next/dynamic";
import React from "react";
import {faRss} from "@fortawesome/free-solid-svg-icons";
import styled from "@emotion/styled";
import {NAV_ITEMS} from "../data/nav";

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
            ← Back to home
        </Link>
    </div>
);

const BlogLink = () => (
    <div className={styles.backTo}>
        <Link href="/blog">
            ← Back to blog
        </Link>
    </div>
);

const GoBackToLink = (props) => {
    if (props.pageType == PageType.Home)
        return (<></>);
    if (props.pageType == PageType.BlogPost)
        return (<BlogLink/>);
    return (<HomeLink/>);
};

const HiddenSpacer = styled.div`
  height: 32px;
  width: 8px;
`

const NAV_LINKS = NAV_ITEMS.filter((item) => item.showInNav !== false);

export default function Layout({
                                   children,
                                   pageType,
                                   description,
                               }: {
    children: React.ReactNode
    pageType?: PageType
    description?: string
}) {
    const metaDescription = description
        ?? 'A portal to my personal and professional work, musings, and general junk!';
    return (
        <div>
            <Head>
                <link rel="icon" href="/favicon.ico"/>
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/>
                <link rel="manifest" href="/site.webmanifest"/>
                <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2568ff"/>
                <meta name="msapplication-TileColor" content="#2568ff"/>
                <meta name="theme-color" content="#fdfdfd"/>
                <meta name="description" content={metaDescription}/>
                <meta property="og:description" content={metaDescription}/>
                <meta name="twitter:description" content={metaDescription}/>
                <meta
                    property="og:image"
                    content={`https://og-image.vercel.app/${encodeURI(
                        siteTitle
                    )}.png?theme=dark&md=0&fontSize=75px&images=https%3A%2F%2Fassets.zeit.co%2Fimage%2Fupload%2Ffront%2Fassets%2Fdesign%2Fnextjs-black-logo.svg`}
                />
                <meta name="og:title" content={siteTitle}/>
                <meta name="twitter:card" content="summary_large_image"/>
            </Head>
            <header className={styles.siteHeader}>
                <div className={styles.siteHeaderInner}>
                    <div className={styles.brand}>
                        <Link href="/" className={styles.brandLink}>
                            Jerrett Davis
                        </Link>
                        <span className={styles.brandTag}>The Overengineer</span>
                    </div>
                    <nav className={styles.navLinks} aria-label="Primary">
                        {NAV_LINKS.map((item) => (
                            <Link href={item.href} className={styles.navLink} key={item.href}>
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    <div className={styles.actionRow}>
                        <a href="https://github.com/jerrettdavis"
                           target="_blank"
                           rel="noreferrer"
                           title="My Github page"
                           aria-label="Go to my Github page"
                           className={styles.socialLink}
                        >
                            <FontAwesomeIcon icon={faGithub}/>
                        </a>
                        <a href="https://bsky.app/profile/jerrett.dev"
                           target="_blank"
                           rel="noreferrer"
                           title="My Bluesky profile"
                           aria-label="Go to my Bluesky profile"
                           className={styles.socialLink}
                        >
                            <FontAwesomeIcon icon={faBluesky}/>
                        </a>
                        <a href="https://mastodon.social/@JerrettDavis"
                           target="_blank"
                           rel="noreferrer"
                           title="My Mastodon.Social page"
                           aria-label="Go to my Mastodon.Social page"
                           className={styles.socialLink}
                        >
                            <FontAwesomeIcon icon={faMastodon}/>
                        </a>
                        <a href="https://www.linkedin.com/in/jddpro/"
                           target="_blank"
                           rel="noreferrer"
                           title="My LinkedIn page"
                           aria-label="Go to my LinkedIn page"
                           className={styles.socialLink}
                        >
                            <FontAwesomeIcon icon={faLinkedin}/>
                        </a>
                        <a href="/rss.xml"
                           target="_blank"
                           rel="noreferrer"
                           title="RSS Feed"
                           aria-label="Go to my RSS Feed"
                           className={styles.socialLink}
                        >
                            <FontAwesomeIcon icon={faRss}/>
                        </a>
                        <HiddenSpacer/>
                        <div className={utilStyles.marginLeft8}>
                            <ThemeToggle/>
                        </div>
                    </div>
                </div>
            </header>
            <div className={styles.container}>
                <main>{children}</main>
                <GoBackToLink pageType={pageType}/>
            </div>

        </div>
    )
}

