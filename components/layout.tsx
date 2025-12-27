import Head from 'next/head'
import styles from './layout.module.css'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faBluesky, faGithub, faLinkedin, faMastodon} from '@fortawesome/free-brands-svg-icons'
import dynamic from "next/dynamic";
import React, {useEffect, useRef, useState} from "react";
import {faRss} from "@fortawesome/free-solid-svg-icons";
import {NAV_ITEMS} from "../data/nav";
import CommandPalette from "./commandPalette";
import {useRouter} from "next/router";
import {useSectionGrid} from "../lib/hooks/useSectionGrid";
import {useReveal} from "../lib/hooks/useReveal";
import {useGlowHotspot} from "../lib/hooks/useGlowHotspot";
import {useScrollProgress} from "../lib/hooks/useScrollProgress";
import {useSectionIndex} from "../lib/hooks/useSectionIndex";
import PipelineStatus from "./pipelineStatus";
import SiteBuildStatus from "./siteBuildStatus";
import {useBodyScrollLock} from "../lib/hooks/useBodyScrollLock";
import TelemetryRefresh from "./telemetryRefresh";

const name = 'Jerrett Davis'
export const siteTitle = 'My Slice of the Internet'

export enum PageType {
    Home,
    BlogPost
}

const ThemeToggle = dynamic(() => import('../components/themeToggle'), {
    ssr: false,
});

const SearchOverlay = dynamic(() => import('./searchOverlay'), {
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

interface GoBackToLinkProps {
    pageType?: PageType;
}

const GoBackToLink = ({pageType}: GoBackToLinkProps) => {
    if (pageType === PageType.Home) return <></>;
    if (pageType === PageType.BlogPost) return <BlogLink/>;
    return <HomeLink/>;
};

const NAV_LINKS = NAV_ITEMS.filter((item) => item.showInNav !== false && item.href !== '/search');
const SEARCH_ITEM = NAV_ITEMS.find((item) => item.href === '/search');
const FOOTER_LINKS = NAV_ITEMS.filter((item) => item.href !== '/search');

export default function Layout({
                                   children,
                                   pageType,
                                   description,
                                   containerVariant,
                               }: {
    children: React.ReactNode
    pageType?: PageType
    description?: string
    containerVariant?: 'default' | 'wide'
}) {
    const router = useRouter();
    const metaDescription = description
        ?? 'A portal to my personal and professional work, musings, and general junk!';
    const containerClassName = containerVariant === 'wide'
        ? `${styles.container} ${styles.containerWide}`
        : styles.container;
    const mainRef = useRef<HTMLElement | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jerrettdavis.com';
    const ogImageUrl = `${baseUrl}/og-image.png`;

    useEffect(() => {
        setIsMenuOpen(false);
    }, [router.asPath]);

    useBodyScrollLock(isMenuOpen);

    useSectionGrid(
        mainRef,
        {
            sectionClassName: styles.gridSection,
            activeClassName: styles.gridSectionActive,
            rootMargin: '0px 0px -55% 0px',
            threshold: 0.2,
        },
        [router.asPath],
    );
    useReveal(mainRef, [router.asPath]);
    useGlowHotspot();
    useScrollProgress([router.asPath]);
    const {items: sectionItems, activeId} = useSectionIndex(
        mainRef,
        {activeClassName: styles.gridSectionActive},
        [router.asPath],
    );

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
                    content={ogImageUrl}
                />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:type" content="image/png" />
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
                        <div className={styles.brandSocialRow}>
                            <a href="https://github.com/jerrettdavis"
                               target="_blank"
                               rel="noreferrer"
                               title="My Github page"
                               aria-label="Go to my Github page"
                               className={`${styles.socialLink} glowable`}
                            >
                                <FontAwesomeIcon icon={faGithub}/>
                            </a>
                            <a href="https://bsky.app/profile/jerrett.dev"
                               target="_blank"
                               rel="noreferrer"
                               title="My Bluesky profile"
                               aria-label="Go to my Bluesky profile"
                               className={`${styles.socialLink} glowable`}
                            >
                                <FontAwesomeIcon icon={faBluesky}/>
                            </a>
                            <a href="https://mastodon.social/@JerrettDavis"
                               target="_blank"
                               rel="noreferrer"
                               title="My Mastodon.Social page"
                               aria-label="Go to my Mastodon.Social page"
                               className={`${styles.socialLink} glowable`}
                            >
                                <FontAwesomeIcon icon={faMastodon}/>
                            </a>
                            <a href="https://www.linkedin.com/in/jddpro/"
                               target="_blank"
                               rel="noreferrer"
                               title="My LinkedIn page"
                               aria-label="Go to my LinkedIn page"
                               className={`${styles.socialLink} glowable`}
                            >
                                <FontAwesomeIcon icon={faLinkedin}/>
                            </a>
                            <a href="/rss.xml"
                               target="_blank"
                               rel="noreferrer"
                               title="RSS Feed"
                               aria-label="Go to my RSS Feed"
                               className={`${styles.socialLink} glowable`}
                            >
                                <FontAwesomeIcon icon={faRss}/>
                            </a>
                        </div>
                    </div>
                    <nav className={styles.navLinks} aria-label="Primary">      
                        {NAV_LINKS.map((item) => (
                            <Link href={item.href} className={`${styles.navLink} glowable`} key={item.href}>
                                {item.label}
                            </Link>
                        ))}
                        <SearchOverlay
                            className={`${styles.navButton} glowable`}
                            label={SEARCH_ITEM?.label ?? 'Search'}
                        />
                    </nav>
                    <div className={styles.actionRow}>
                        <SiteBuildStatus variant="header" />
                        <PipelineStatus variant="header" />
                        <div className={utilStyles.marginLeft8}>
                            <ThemeToggle/>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`${styles.menuToggle} glowable`}
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        aria-label="Toggle navigation menu"
                        aria-expanded={isMenuOpen}
                        aria-controls="mobile-nav"
                        data-open={isMenuOpen}
                    >
                        <span className={styles.menuIcon} aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </span>
                        <span className={styles.menuLabel}>Menu</span>
                    </button>
                </div>
                <div className={styles.scrollProgress} aria-hidden="true" />
            </header>
            <div
                className={`${styles.mobileScrim} ${isMenuOpen ? styles.mobileScrimOpen : ''}`}
                onClick={() => setIsMenuOpen(false)}
                aria-hidden="true"
            />
            <div
                id="mobile-nav"
                className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}
                aria-hidden={!isMenuOpen}
            >
                <div className={styles.mobileHeader}>
                    <span className={styles.mobileTitle}>Navigation</span>
                    <button
                        type="button"
                        className={styles.mobileClose}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Close
                    </button>
                </div>
                <nav className={styles.mobileLinks} aria-label="Mobile">
                    {NAV_LINKS.map((item) => (
                        <Link
                            href={item.href}
                            className={`${styles.mobileLink} glowable`}
                            key={item.href}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                    <SearchOverlay
                        className={`${styles.mobileButton} glowable`}
                        label={SEARCH_ITEM?.label ?? 'Search'}
                    />
                </nav>
                <div className={styles.mobileFooter}>
                    <span className={styles.mobileFooterLabel}>Theme</span>
                    <ThemeToggle/>
                </div>
            </div>
            <div className={containerClassName}>
                <main ref={mainRef}>{children}</main>
                <GoBackToLink pageType={pageType}/>
            </div>
            {sectionItems.length > 1 && (
                <nav className={styles.sectionIndex} aria-label="Section index">
                    {sectionItems.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className={`${styles.sectionDot} ${activeId === item.id ? styles.sectionDotActive : ''}`}
                            aria-current={activeId === item.id ? 'true' : undefined}
                            aria-label={item.label}
                        >
                            <span className={styles.sectionDotLabel}>{item.label}</span>
                        </a>
                    ))}
                </nav>
            )}
            <footer className={styles.siteFooter}>
                <div className={styles.footerInner}>
                    <div className={styles.footerCol}>
                        <div className={styles.footerTitle}>Jerrett Davis</div>
                        <p className={styles.footerText}>
                            Static-first engineering notes, systems, and writing.
                        </p>
                        <div className={styles.footerMeta}>
                            © {new Date().getFullYear()} Jerrett Davis. All rights reserved.
                        </div>
                    </div>
                    <div className={styles.footerCol}>
                        <div className={styles.footerTitle}>Site</div>
                        <div className={styles.footerLinks}>
                            {FOOTER_LINKS.map((item) => (
                                <Link href={item.href} key={item.href}>
                                    {item.label}
                                </Link>
                            ))}
                            <a href="/sitemap.xml" target="_blank" rel="noreferrer">
                                Sitemap
                            </a>
                        </div>
                    </div>
                    <div className={styles.footerCol}>
                        <div className={styles.footerTitle}>Elsewhere</div>
                        <div className={styles.footerLinks}>
                            <a href="https://github.com/jerrettdavis" target="_blank" rel="noreferrer">
                                GitHub
                            </a>
                            <a href="https://bsky.app/profile/jerrett.dev" target="_blank" rel="noreferrer">
                                Bluesky
                            </a>
                            <a href="https://mastodon.social/@JerrettDavis" target="_blank" rel="noreferrer">
                                Mastodon
                            </a>
                            <a href="https://www.linkedin.com/in/jddpro/" target="_blank" rel="noreferrer">
                                LinkedIn
                            </a>
                            <a href="/rss.xml" target="_blank" rel="noreferrer">
                                RSS
                            </a>
                        </div>
                    </div>
                    <div className={styles.footerCol}>
                        <div className={styles.footerTitle}>Extras</div>        
                        <div className={styles.footerLinks}>
                            <Link href="/docs/architecture">Architecture map</Link>
                            <Link href="/docs/content-pipeline">Content pipeline</Link>
                            <Link href="/search">Search</Link>
                        </div>
                        <div className={styles.footerStatus}>
                            <div className={styles.footerStatusLabel}>Live status</div>
                            <div className={styles.footerStatusRow}>
                                <SiteBuildStatus compact variant="menu" />
                                <PipelineStatus compact variant="menu" />
                            </div>
                            <TelemetryRefresh />
                        </div>
                        <div className={styles.footerNote}>
                            <CommandPalette />
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    )
}

