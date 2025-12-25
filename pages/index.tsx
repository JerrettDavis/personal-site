import Head from 'next/head';
import Layout, {PageType} from '../components/layout';
import Link from 'next/link';
import Image from 'next/image';
import {GetStaticProps} from 'next';
import {useEffect, useRef, useState} from 'react';
import DateStamp from '../components/date';
import styles from './index.module.css';
import {getSortedPostsData, getAllSeriesSummaries, getTotalPostWordCount} from '../lib/posts';
import type {PostSummary} from '../lib/posts';
import {getAllDocSummaries} from '../lib/docs';
import type {DocSummary} from '../lib/docs';
import {getSortedTagsData} from '../lib/tags';
import {getAllCategories} from '../lib/categories';
import {useParallax} from '../lib/hooks/useParallax';
import StatGrid from '../components/statGrid';
import {toSeriesSlug} from '../lib/blog-utils';
import dynamic from 'next/dynamic';
import type {PipelineEdge, PipelineLane, PipelineNode} from '../components/pipelineFlow';

interface HomeProps {
    recentPosts: PostSummary[];
    docs: DocSummary[];
    tickerItems: {
        type: 'Tag' | 'Category' | 'Series';
        label: string;
        href: string;
    }[];
    heartbeat: {
        totalWords: number;
        latestUpdate: string | null;
    };
    totals: {
        posts: number;
        docs: number;
        tags: number;
        categories: number;
        series: number;
    };
}

const introSentence = 'Software engineer, writer, and systems thinker building a long-form, static-first web presence.';

const PipelineFlow = dynamic(() => import('../components/pipelineFlow'), {ssr: false});

const PIPELINE_LANES: PipelineLane[] = [
    {id: 'source', label: 'Source', summary: 'Markdown + assets'},
    {id: 'ingest', label: 'Ingest', summary: 'Normalize + index'},
    {id: 'render', label: 'Render', summary: 'Compile + SSG'},
    {id: 'deploy', label: 'Deploy', summary: 'Vercel + CDN'},
    {id: 'observe', label: 'Observe', summary: 'Telemetry + refresh'},
];

const PIPELINE_STEPS = [
    {
        id: 'source',
        label: 'Source',
        title: 'Commit and content pickup',
        summary: 'Markdown, frontmatter, and assets land in git and are staged for the build graph.',
        meta: ['Inputs: posts/, docs/', 'Assets: public/ + images', 'Parallel: docs + posts'],
    },
    {
        id: 'ingest',
        label: 'Ingest',
        title: 'Normalize and index',
        summary: 'Taxonomies and search indexes build in parallel so navigation stays instant.',
        meta: ['Parallel: tags + categories', 'Search index JSON', 'Feeds + sitemap prep'],
    },
    {
        id: 'render',
        label: 'Render',
        title: 'Render and package',
        summary: 'MDX compiles to HTML while Next.js renders static pages and layout shells.',
        meta: ['remark + rehype', 'Static generation', 'Edge-ready bundles'],
    },
    {
        id: 'deploy',
        label: 'Deploy',
        title: 'Build and distribute',
        summary: 'Vercel builds, deploys, and spins preview branches for every PR.',
        meta: ['Preview deployments', 'Production deploy', 'CDN warmup'],
    },
    {
        id: 'observe',
        label: 'Observe',
        title: 'Observe and refresh',
        summary: 'Telemetry caches pipeline signals and lets visitors refresh safely.',
        meta: ['Rate-limit aware', 'Cached status panels', 'Manual refresh hooks'],
    },
];

const PIPELINE_NODES: PipelineNode[] = [
    {id: 'markdown', lane: 'source', title: 'Markdown sources', meta: 'posts/, docs/', step: 0, order: 0, column: 0},
    {id: 'assets', lane: 'source', title: 'Media + config', meta: 'public/, images/', step: 0, order: 1, column: 0},
    {id: 'taxonomy', lane: 'ingest', title: 'Taxonomy graph', meta: 'tags + series', step: 1, order: 0, column: 1},
    {id: 'search', lane: 'ingest', title: 'Search index', meta: 'buildSearchIndex', step: 1, order: 1, column: 1},
    {id: 'mdx', lane: 'render', title: 'MDX transform', meta: 'remark/rehype', step: 2, order: 0, column: 2},
    {id: 'ssg', lane: 'render', title: 'Static render', meta: 'Next.js SSG', step: 2, order: 1, column: 3},
    {id: 'deploy', lane: 'deploy', title: 'Vercel build', meta: 'immutable artifacts', step: 3, order: 0, column: 4},
    {id: 'previews', lane: 'deploy', title: 'Preview branches', meta: 'PR deployments', step: 3, order: 1, column: 4},
    {id: 'telemetry', lane: 'observe', title: 'Telemetry cache', meta: 'cacheStore + hooks', step: 4, order: 0, column: 5},
    {id: 'status', lane: 'observe', title: 'Status surfaces', meta: '/pipelines + /work-in-progress', step: 4, order: 1, column: 6},
];

const PIPELINE_EDGES: PipelineEdge[] = [
    {id: 'e-markdown-taxonomy', source: 'markdown', target: 'taxonomy', step: 0},
    {id: 'e-markdown-mdx', source: 'markdown', target: 'mdx', step: 0},
    {id: 'e-assets-mdx', source: 'assets', target: 'mdx', step: 0},
    {id: 'e-taxonomy-ssg', source: 'taxonomy', target: 'ssg', step: 1},
    {id: 'e-search-ssg', source: 'search', target: 'ssg', step: 1},
    {id: 'e-mdx-ssg', source: 'mdx', target: 'ssg', step: 2},
    {id: 'e-ssg-deploy', source: 'ssg', target: 'deploy', step: 3},
    {id: 'e-ssg-previews', source: 'ssg', target: 'previews', step: 3},
    {id: 'e-deploy-telemetry', source: 'deploy', target: 'telemetry', step: 4},
    {id: 'e-previews-telemetry', source: 'previews', target: 'telemetry', step: 4},
    {id: 'e-telemetry-status', source: 'telemetry', target: 'status', step: 4},
];

export default function Home({recentPosts, docs, totals, tickerItems, heartbeat}: HomeProps) {
    const heroRef = useRef<HTMLElement | null>(null);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const wordFormatter = new Intl.NumberFormat('en-US');
    const telemetryStats = [
        {id: 'posts', label: 'Posts', value: totals.posts},
        {id: 'docs', label: 'Docs', value: totals.docs},
        {id: 'tags', label: 'Tags', value: totals.tags},
        {id: 'categories', label: 'Categories', value: totals.categories},      
        {id: 'series', label: 'Series', value: totals.series},
    ];

    useParallax(heroRef, {max: 160, factor: 0.12, cssVar: '--hero-parallax'});

    const tickerLoop = tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : [];
    const latestUpdateContent = heartbeat.latestUpdate
        ? <DateStamp dateString={heartbeat.latestUpdate} />
        : 'n/a';

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = () => {
            if (media.matches) {
                setIsPlaying(false);
            }
        };
        handleChange();
        if (media.addEventListener) {
            media.addEventListener('change', handleChange);
        } else {
            media.addListener(handleChange);
        }
        return () => {
            if (media.addEventListener) {
                media.removeEventListener('change', handleChange);
            } else {
                media.removeListener(handleChange);
            }
        };
    }, []);

    useEffect(() => {
        if (!isPlaying) return;
        const interval = window.setInterval(() => {
            setActiveStepIndex((prev) => (prev + 1) % PIPELINE_STEPS.length);
        }, 4200);
        return () => window.clearInterval(interval);
    }, [isPlaying]);

    const activeStep = PIPELINE_STEPS[activeStepIndex];
    const pipelineProgress = PIPELINE_STEPS.length > 1
        ? (activeStepIndex / (PIPELINE_STEPS.length - 1)) * 100
        : 0;

    return (
        <Layout pageType={PageType.Home} description={introSentence}>
            <Head>
                <title>Jerrett Davis - The Overengineer</title>
            </Head>
            <section className={styles.hero} ref={heroRef} aria-label="Overview">
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
                    <StatGrid
                        items={telemetryStats}
                        gridClassName={styles.statGrid}
                        itemClassName={styles.statItem}
                        valueClassName={styles.statValue}
                        labelClassName={styles.statLabel}
                    />
                    <div className={styles.heartbeat}>
                        <p className={styles.heartbeatKicker}>Site heartbeat</p>
                        <div className={styles.heartbeatStats}>
                            <div className={styles.heartbeatStat}>
                                <span className={styles.heartbeatValue}>
                                    {wordFormatter.format(heartbeat.totalWords)}
                                </span>
                                <span className={styles.heartbeatLabel}>Words logged</span>
                            </div>
                            <div className={styles.heartbeatStat}>
                                <span className={styles.heartbeatValue}>
                                    {latestUpdateContent}
                                </span>
                                <span className={styles.heartbeatLabel}>Latest update</span>
                            </div>
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
            {tickerItems.length > 0 && (
                <section className={styles.tickerSection} aria-label="Signal ticker">
                    <div className={styles.tickerHeader}>
                        <div>
                            <p className={styles.tickerKicker}>Signal</p>
                            <h2 className={styles.tickerTitle}>Topic loop</h2>
                        </div>
                        <span className={styles.tickerMeta}>Tags, categories, and series</span>
                    </div>
                    <div className={styles.ticker}>
                        <div className={styles.tickerTrack}>
                            {tickerLoop.map((item, index) => {
                                const isDuplicate = index >= tickerItems.length;
                                return (
                                    <Link
                                        href={item.href}
                                        className={`${styles.tickerItem} glowable`}
                                        data-type={item.type}
                                        aria-hidden={isDuplicate}
                                        tabIndex={isDuplicate ? -1 : undefined}
                                        key={`${item.type}-${item.label}-${index}`}
                                    >
                                        <span className={styles.tickerType}>{item.type}</span>
                                        <span className={styles.tickerLabel}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}
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
                        <div className={styles.signalControls}>
                            <button
                                type="button"
                                className={`${styles.signalControlButton} glowable`}
                                onClick={() => setIsPlaying((prev) => !prev)}
                                aria-pressed={isPlaying}
                                aria-label={isPlaying ? 'Pause pipeline animation' : 'Play pipeline animation'}
                            >
                                {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <span className={styles.signalStepBadge}>
                                Step {activeStepIndex + 1} / {PIPELINE_STEPS.length}
                            </span>
                        </div>
                    </div>
                    <div className={styles.signalSummary}>
                        <div className={styles.signalSummaryHeader}>
                            <p className={styles.signalSummaryKicker}>Active stage</p>
                            <h4 className={styles.signalSummaryTitle}>{activeStep.title}</h4>
                            <p className={styles.signalSummaryText}>{activeStep.summary}</p>
                        </div>
                        <div className={styles.signalSummaryMeta}>
                            {activeStep.meta.map((item) => (
                                <span className={styles.signalMetaChip} key={item}>
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className={styles.signalFlow}>
                        <PipelineFlow
                            lanes={PIPELINE_LANES}
                            nodes={PIPELINE_NODES}
                            edges={PIPELINE_EDGES}
                            activeStepIndex={activeStepIndex}
                            isPlaying={isPlaying}
                            onSelectStep={(stepIndex) => {
                                setActiveStepIndex(stepIndex);
                                setIsPlaying(false);
                            }}
                        />
                    </div>
                    <div className={styles.signalTimelineRow}>
                        <div className={styles.signalTimelineTrack} aria-hidden="true">
                            <span
                                className={styles.signalTimelineProgress}
                                style={{width: `${pipelineProgress}%`}}
                            />
                        </div>
                        <ol className={styles.signalTimeline} aria-label="Pipeline timeline">
                            {PIPELINE_STEPS.map((step, index) => (
                                <li
                                    className={styles.signalTimelineItem}
                                    data-active={index === activeStepIndex ? 'true' : undefined}
                                    key={step.id}
                                >
                                    <button
                                        type="button"
                                        className={`${styles.signalTimelineButton} glowable`}
                                        onClick={() => {
                                            setActiveStepIndex(index);
                                            setIsPlaying(false);
                                        }}
                                        aria-current={index === activeStepIndex ? 'step' : undefined}
                                    >
                                        <span className={styles.signalTimelineIndex}>
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className={styles.signalTimelineLabel}>{step.label}</span>
                                        <span className={styles.signalTimelineTitle}>{step.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className={styles.signalFooter}>
                        <div className={styles.signalFooterRow}>
                            <Link href="/docs/content-pipeline">Read the pipeline doc</Link>
                            <span className={styles.signalNote}>Cache-first, refresh on demand.</span>
                        </div>
                        <div className={styles.signalLegend}>
                            <span className={styles.signalLegendItem}>Parallel lanes</span>
                            <span className={styles.signalLegendItem}>Preview branches</span>
                            <span className={styles.signalLegendItem}>Telemetry cache</span>
                            <span className={styles.signalLegendItem}>Click a node to jump</span>
                        </div>
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
                                <DateStamp dateString={post.date} />
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
    const [posts, docSummaries, tags, categories, series, totalWords] = await Promise.all([
        getSortedPostsData(),
        getAllDocSummaries(),
        getSortedTagsData(),
        getAllCategories(),
        getAllSeriesSummaries(),
        getTotalPostWordCount(),
    ]);

    const docsAll = docSummaries.filter((doc) => doc.slug.length > 0);
    const docs = docsAll.slice(0, 3);
    const recentPosts = posts.slice(0, 3);
    const latestDocUpdate = docSummaries
        .map((doc) => doc.updated)
        .filter((value): value is string => Boolean(value))
        .reduce((latest, value) => {
            if (!latest) return value;
            if (!value) return latest;
            return globalThis.Date.parse(value) > globalThis.Date.parse(latest) ? value : latest;
        }, null as string | null);
    const latestPostDate = posts[0]?.date ?? null;
    const latestUpdate = [latestPostDate, latestDocUpdate].reduce((latest, value) => {
        if (!value) return latest;
        if (!latest) return value;
        return globalThis.Date.parse(value) > globalThis.Date.parse(latest) ? value : latest;
    }, null as string | null);

    const tagItems = tags
        .map((tag) => tag.tagName)
        .filter((tag) => tag && tag.trim().length > 0)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 8)
        .map((tag) => ({
            type: 'Tag' as const,
            label: tag,
            href: `/blog/tags/${encodeURIComponent(tag)}`,
        }));
    const categoryItems = categories
        .slice(0, 6)
        .map((category) => ({
            type: 'Category' as const,
            label: category.categoryName,
            href: `/blog/categories/${category.categoryPath}`,
        }));
    const seriesItems = series
        .slice(0, 4)
        .map((seriesItem) => ({
            type: 'Series' as const,
            label: seriesItem.name,
            href: `/blog/series/${toSeriesSlug(seriesItem.name)}`,
        }));
    const maxLen = Math.max(tagItems.length, categoryItems.length, seriesItems.length);
    const tickerItems: HomeProps['tickerItems'] = [];
    for (let index = 0; index < maxLen; index += 1) {
        if (tagItems[index]) tickerItems.push(tagItems[index]);
        if (categoryItems[index]) tickerItems.push(categoryItems[index]);
        if (seriesItems[index]) tickerItems.push(seriesItems[index]);
    }

    return {
        props: {
            recentPosts,
            docs,
            tickerItems,
            heartbeat: {
                totalWords,
                latestUpdate,
            },
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
