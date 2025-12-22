import Head from 'next/head';
import Layout, {PageType} from '../components/layout';
import Link from 'next/link';
import Image from 'next/image';
import {GetStaticProps} from 'next';
import {useEffect, useRef} from 'react';
import Date from '../components/date';
import styles from './index.module.css';
import {getSortedPostsData, getAllSeriesSummaries} from '../lib/posts';
import type {PostSummary} from '../lib/posts';
import {getAllDocSummaries} from '../lib/docs';
import type {DocSummary} from '../lib/docs';
import {getSortedTagsData} from '../lib/tags';
import {getAllCategories} from '../lib/categories';

interface HomeProps {
    recentPosts: PostSummary[];
    docs: DocSummary[];
    totals: {
        posts: number;
        docs: number;
        tags: number;
        categories: number;
        series: number;
    };
}

const introSentence = 'Software engineer, writer, and systems thinker building a long-form, static-first web presence.';

export default function Home({recentPosts, docs, totals}: HomeProps) {
    const heroRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const hero = heroRef.current;
        if (!hero || typeof window === 'undefined') return;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            hero.style.setProperty('--hero-parallax', '0px');
            return;
        }

        let rafId = 0;
        const update = () => {
            rafId = 0;
            const offset = Math.min(160, window.scrollY * 0.12);
            hero.style.setProperty('--hero-parallax', `${offset}px`);
        };

        const onScroll = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, {passive: true});
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, []);

    return (
        <Layout pageType={PageType.Home} description={introSentence}>
            <Head>
                <title>Jerrett Davis - The Overengineer</title>
            </Head>
            <section className={styles.hero} ref={heroRef}>
                <div className={styles.gridField} aria-hidden="true" />
                <div className={styles.heroCopy}>
                    <div className={styles.avatarRow}>
                        <div className={styles.avatarWrap}>
                            <Image
                                priority
                                src="/images/profile.png"
                                className={styles.avatar}
                                height={72}
                                width={72}
                                alt="Photo of Jerrett Davis"
                            />
                        </div>
                        <div className={styles.avatarMeta}>
                            <span className={styles.avatarTitle}>The Overengineer</span>
                            <span className={styles.avatarSubtitle}>Engineering and narrative systems</span>
                        </div>
                    </div>
                    <p className={styles.kicker}>Home</p>
                    <h1 className={styles.title}>Jerrett Davis</h1>
                    <p className={styles.lede}>
                        {introSentence} This space is a living lab for content systems, thoughtful tooling, and
                        architecture that stays close to the code.
                    </p>
                    <div className={styles.heroActions}>
                        <Link href="/projects" className={`${styles.primaryLink} glowable`}>
                            Projects
                        </Link>
                        <Link href="/docs" className={`${styles.secondaryLink} glowable`}>
                            Architecture
                        </Link>
                        <Link href="/blog" className={`${styles.secondaryLink} glowable`}>
                            Writing
                        </Link>
                    </div>
                </div>
                <div className={styles.heroCard}>
                    <div className={styles.heroCardHeader}>
                        <div>
                            <p className={styles.heroCardKicker}>System signals</p>
                            <h2 className={styles.heroCardTitle}>Site telemetry</h2>
                        </div>
                        <Link href="/docs" className={`${styles.heroCardLink} glowable`}>
                            Docs
                        </Link>
                    </div>
                    <div className={styles.statGrid}>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Posts</span>
                            <span className={styles.statValue}>{totals.posts}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Docs</span>
                            <span className={styles.statValue}>{totals.docs}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Tags</span>
                            <span className={styles.statValue}>{totals.tags}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Categories</span>
                            <span className={styles.statValue}>{totals.categories}</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statLabel}>Series</span>
                            <span className={styles.statValue}>{totals.series}</span>
                        </div>
                    </div>
                    <div className={styles.commandHint}>
                        Tip: Press <span className={styles.commandKey}>Cmd</span>/<span className={styles.commandKey}>Ctrl</span> +{' '}
                        <span className={styles.commandKey}>K</span> to open the command palette.
                    </div>
                    <div className={styles.quickLinks}>
                        <Link href="/docs/architecture">Architecture map</Link>
                        <Link href="/docs/content-pipeline">Content pipeline</Link>
                        <Link href="/search">Search the site</Link>
                    </div>
                </div>
            </section>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Explore</p>
                    <h2 className={styles.sectionTitle}>More than a blog</h2>
                    <p className={styles.sectionLead}>
                        A quick way to jump into the hands-on notes, tools, and off-hours projects.
                    </p>
                </div>
                <div className={styles.cardGrid}>
                    <Link href="/docs" className={`${styles.card} glowable`}>
                        <div>
                            <span className={styles.cardTitle}>Docs</span>
                            <p className={styles.cardSummary}>
                                Architecture, decisions, and the working blueprint of this site.
                            </p>
                        </div>
                        <span className={styles.cardMeta}>/docs</span>
                    </Link>
                    <Link href="/tools" className={`${styles.card} glowable`}>
                        <div>
                            <span className={styles.cardTitle}>Tools</span>
                            <p className={styles.cardSummary}>
                                Hardware, software, and gear that keep my workflow moving.
                            </p>
                        </div>
                        <span className={styles.cardMeta}>/tools</span>
                    </Link>
                    <Link href="/hobbies" className={`${styles.card} glowable`}>
                        <div>
                            <span className={styles.cardTitle}>Hobbies</span>
                            <p className={styles.cardSummary}>
                                Experiments and off-hours curiosities that recharge the creative side.
                            </p>
                        </div>
                        <span className={styles.cardMeta}>/hobbies</span>
                    </Link>
                </div>
            </section>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Architecture</p>
                    <h2 className={styles.sectionTitle}>How the site is wired</h2>
                    <p className={styles.sectionLead}>
                        Documentation keeps the stack visible, from markdown parsing to deployment.
                    </p>
                </div>
                <div className={styles.cardGrid}>
                    {docs.map((doc) => (
                        <Link href={doc.route} className={`${styles.card} glowable`} key={doc.route}>
                            <div>
                                <span className={styles.cardTitle}>{doc.title}</span>
                                <p className={styles.cardSummary}>{doc.description}</p>
                            </div>
                            <span className={styles.cardMeta}>{doc.route}</span>
                        </Link>
                    ))}
                </div>
            </section>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Tech demo</p>
                    <h2 className={styles.sectionTitle}>Static pipeline signal</h2>
                    <p className={styles.sectionLead}>
                        A lightweight visual of the markdown-to-page path that keeps the site fast.
                    </p>
                </div>
                <div className={styles.signalCard}>
                    <div className={styles.signalHeader}>
                        <div>
                            <p className={styles.signalKicker}>Pipeline</p>
                            <h3 className={styles.signalTitle}>Content flow</h3>
                        </div>
                        <span className={styles.signalBadge}>Fast path</span>
                    </div>
                    <div className={styles.signalBar} aria-hidden="true" />
                    <div className={styles.signalNodes}>
                        <div className={styles.signalNode}>
                            <span className={styles.signalNodeTitle}>Markdown</span>
                            <span className={styles.signalNodeMeta}>posts/, docs/</span>
                        </div>
                        <div className={styles.signalNode}>
                            <span className={styles.signalNodeTitle}>Render</span>
                            <span className={styles.signalNodeMeta}>remark/rehype</span>
                        </div>
                        <div className={styles.signalNode}>
                            <span className={styles.signalNodeTitle}>Static pages</span>
                            <span className={styles.signalNodeMeta}>Next.js build</span>
                        </div>
                    </div>
                    <div className={styles.signalFooter}>
                        <Link href="/docs/content-pipeline">Read the pipeline doc</Link>
                        <span className={styles.signalNote}>No runtime database.</span>
                    </div>
                </div>
            </section>
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <p className={styles.sectionKicker}>Writing</p>
                    <h2 className={styles.sectionTitle}>Latest writing</h2>
                    <p className={styles.sectionLead}>
                        Essays, engineering notes, and decision logs from recent builds.
                    </p>
                </div>
                <div className={styles.cardGrid}>
                    {recentPosts.map((post) => (
                        <Link href={`/blog/posts/${post.id}`} className={`${styles.card} glowable`} key={post.id}>
                            <div>
                                <span className={styles.cardTitle}>{post.title}</span>
                                <p className={styles.cardSummary}>
                                    {post.description && post.description.trim().length > 0
                                        ? post.description
                                        : post.stub}
                                </p>
                            </div>
                            <span className={styles.cardMeta}>
                                <Date dateString={post.date} />
                            </span>
                        </Link>
                    ))}
                </div>
                <div className={styles.sectionActions}>
                    <Link href="/blog" className={`${styles.secondaryLink} glowable`}>
                        View all posts
                    </Link>
                </div>
            </section>
        </Layout>
    );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
    const [posts, docSummaries, tags, categories, series] = await Promise.all([
        getSortedPostsData(),
        getAllDocSummaries(),
        getSortedTagsData(),
        getAllCategories(),
        getAllSeriesSummaries(),
    ]);

    const docsAll = docSummaries.filter((doc) => doc.slug.length > 0);
    const docs = docsAll.slice(0, 3);
    const recentPosts = posts.slice(0, 3);

    return {
        props: {
            recentPosts,
            docs,
            totals: {
                posts: posts.length,
                docs: docsAll.length,
                tags: tags.length,
                categories: categories.length,
                series: series.length,
            },
        },
    };
};
