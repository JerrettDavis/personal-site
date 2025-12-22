import Head from 'next/head'
import styles from './layout.module.css'
import utilStyles from '../styles/utils.module.css'
import Link from 'next/link'
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome'
import {faBluesky, faGithub, faLinkedin, faMastodon} from '@fortawesome/free-brands-svg-icons'
import dynamic from "next/dynamic";
import React, {useEffect, useLayoutEffect, useRef} from "react";
import {faRss} from "@fortawesome/free-solid-svg-icons";
import {NAV_ITEMS} from "../data/nav";
import CommandPalette from "./commandPalette";
import {useRouter} from "next/router";

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

const GoBackToLink = (props) => {
    if (props.pageType == PageType.Home)
        return (<></>);
    if (props.pageType == PageType.BlogPost)
        return (<BlogLink/>);
    return (<HomeLink/>);
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

    useEffect(() => {
        const main = mainRef.current;
        if (!main) return;
        const sections = Array.from(main.querySelectorAll('section'));
        if (sections.length === 0) return;
        const sectionClass = styles.gridSection;
        const activeClass = styles.gridSectionActive;

        sections.forEach((section) => {
            section.classList.add(sectionClass);
        });

        if (typeof IntersectionObserver === 'undefined') {
            return () => {
                sections.forEach((section) => {
                    section.classList.remove(sectionClass, activeClass);
                });
            };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    entry.target.classList.toggle(activeClass, entry.isIntersecting);
                });
            },
            {rootMargin: '0px 0px -55% 0px', threshold: 0.2}
        );

        sections.forEach((section) => observer.observe(section));

        return () => {
            observer.disconnect();
            sections.forEach((section) => {
                section.classList.remove(sectionClass, activeClass);
            });
        };
    }, [router.asPath]);

    const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

    useIsomorphicLayoutEffect(() => {
        const main = mainRef.current;
        if (!main || typeof window === 'undefined') return;

        const containers = Array.from(main.querySelectorAll('section, article')) as HTMLElement[];
        const targets = new Set<HTMLElement>();

        const addChildren = (container: HTMLElement) => {
            Array.from(container.children).forEach((child) => {
                if (!(child instanceof HTMLElement)) return;
                if (child.getAttribute('aria-hidden') === 'true') return;
                targets.add(child);
            });
        };

        containers.forEach(addChildren);

        Array.from(main.children).forEach((child) => {
            if (!(child instanceof HTMLElement)) return;
            const tag = child.tagName.toLowerCase();
            if (tag === 'section' || tag === 'article') return;
            if (child.getAttribute('aria-hidden') === 'true') return;
            targets.add(child);
        });

        if (targets.size === 0) return;

        const revealTargets = Array.from(targets);
        const root = document.documentElement;
        const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
        const progressFromRatio = (ratio: number, isLarge: boolean) => {
            if (ratio <= 0) return 0;
            if (isLarge) return 1;
            const normalized = clamp(ratio / 0.66);
            return 0.2 + (0.8 * normalized);
        };
        const setProgress = (element: HTMLElement, ratio: number, elementHeight: number, viewportHeight: number) => {
            const isLarge = elementHeight > viewportHeight * 1.15;
            const progress = progressFromRatio(ratio, isLarge);
            element.style.setProperty('--reveal-progress', progress.toFixed(3));
        };
        const getVisibleRatio = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const visible = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
            if (rect.height <= 0) return 0;
            const basis = Math.min(rect.height, viewportHeight);
            const ratio = clamp(visible / basis);
            setProgress(element, ratio, rect.height, viewportHeight);
            return ratio;
        };

        revealTargets.forEach((element) => {
            element.setAttribute('data-reveal', 'true');
            element.style.setProperty('--reveal-progress', '0');
        });
        root.dataset.revealReady = 'true';

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
            revealTargets.forEach((element) => setProgress(element, 1, 0, 1));
            return () => {
                revealTargets.forEach((element) => {
                    element.removeAttribute('data-reveal');
                    element.style.removeProperty('--reveal-progress');
                });
                delete root.dataset.revealReady;
            };
        }

        const updateAll = () => {
            revealTargets.forEach((element) => getVisibleRatio(element));
        };

        let rafId = 0;
        rafId = window.requestAnimationFrame(() => {
            rafId = window.requestAnimationFrame(updateAll);
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const boundsHeight = entry.rootBounds?.height ?? window.innerHeight ?? 0;
                    const targetHeight = entry.boundingClientRect?.height ?? 0;
                    const basis = Math.min(targetHeight, boundsHeight);
                    const ratio = basis > 0 ? entry.intersectionRect.height / basis : 0;
                    setProgress(entry.target as HTMLElement, ratio, targetHeight, boundsHeight);
                });
            },
            {threshold: [0, 0.2, 0.4, 0.66, 1]}
        );

        revealTargets.forEach((element) => observer.observe(element));

        const handleResize = () => updateAll();
        window.addEventListener('resize', handleResize);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            if (rafId) window.cancelAnimationFrame(rafId);
            revealTargets.forEach((element) => {
                element.removeAttribute('data-reveal');
                element.style.removeProperty('--reveal-progress');
            });
            delete root.dataset.revealReady;
        };
    }, [router.asPath]);

    useEffect(() => {
        let rafId = 0;
        let lastTarget: HTMLElement | null = null;
        let latestEvent: PointerEvent | null = null;

        const update = () => {
            rafId = 0;
            if (!latestEvent) return;
            const target = (latestEvent.target as HTMLElement | null)?.closest('.glowable') as HTMLElement | null;
            if (target) {
                const rect = target.getBoundingClientRect();
                const x = ((latestEvent.clientX - rect.left) / rect.width) * 100;
                const y = ((latestEvent.clientY - rect.top) / rect.height) * 100;
                target.style.setProperty('--glow-x', `${x}%`);
                target.style.setProperty('--glow-y', `${y}%`);
            }

            if (lastTarget && lastTarget !== target) {
                lastTarget.style.removeProperty('--glow-x');
                lastTarget.style.removeProperty('--glow-y');
            }

            if (!target && lastTarget) {
                lastTarget.style.removeProperty('--glow-x');
                lastTarget.style.removeProperty('--glow-y');
            }

            lastTarget = target ?? null;
        };

        const handlePointerMove = (event: PointerEvent) => {
            latestEvent = event;
            if (rafId) return;
            rafId = window.requestAnimationFrame(update);
        };

        const clearGlow = () => {
            if (lastTarget) {
                lastTarget.style.removeProperty('--glow-x');
                lastTarget.style.removeProperty('--glow-y');
                lastTarget = null;
            }
        };

        document.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('blur', clearGlow);

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('blur', clearGlow);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, []);

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
                        <CommandPalette />
                        <div className={utilStyles.marginLeft8}>
                            <ThemeToggle/>
                        </div>
                    </div>
                </div>
            </header>
            <div className={containerClassName}>
                <main ref={mainRef}>{children}</main>
                <GoBackToLink pageType={pageType}/>
            </div>
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
                        <div className={styles.footerNote}>
                            Tip: Press Cmd/Ctrl + K for the command palette.
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    )
}

