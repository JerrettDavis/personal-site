import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout';
import dynamic from 'next/dynamic';
import {GetStaticPaths, GetStaticProps} from 'next';
import {useRouter} from 'next/router';
import {useCallback, useEffect, useRef, useState, type CSSProperties} from 'react';
import {DocData, DocSummary, getAllDocSlugs, getAllDocSummaries, getDocBySlug} from '../../lib/docs';
import {PIPELINE_EDGES, PIPELINE_LANES, PIPELINE_NODES, PIPELINE_STEPS} from '../../data/pipelineFlow';
import {useHeadingIndex} from '../../lib/hooks/useHeadingIndex';
import styles from './docs.module.css';

interface DocPageProps {
    doc: DocData;
    navItems: DocNavItem[];
    docLookup: Record<string, DocData>;
}

interface DocNavItem {
    title: string;
    slug: string[];
    route: string | null;
    order: number | null;
    children: DocNavItem[];
}

const buildDescription = (doc: DocData) =>
    doc.description && doc.description.trim().length > 0
        ? doc.description
        : `${doc.title} documentation.`;

const toTitleCase = (value: string) =>
    value
        .replace(/-/g, ' ')
        .replace(/\b[a-z]/g, (char) => char.toUpperCase());

const buildDocTree = (summaries: DocSummary[]) => {
    const nodes = new Map<string, DocNavItem>();
    const ensureNode = (slug: string[]) => {
        const key = slug.join('/');
        const existing = nodes.get(key);
        if (existing) return existing;
        const title = slug.length > 0 ? toTitleCase(slug[slug.length - 1]) : 'Documentation';
        const next: DocNavItem = {
            title,
            slug,
            route: slug.length === 0 ? '/docs' : null,
            order: null,
            children: [],
        };
        nodes.set(key, next);
        return next;
    };

    summaries.forEach((summary) => {
        const node = ensureNode(summary.slug);
        node.title = summary.title;
        node.route = summary.route;
        node.order = summary.order ?? null;
        if (summary.slug.length > 0) {
            for (let i = 1; i < summary.slug.length; i += 1) {
                ensureNode(summary.slug.slice(0, i));
            }
        }
    });

    nodes.forEach((node) => {
        if (node.slug.length === 0) return;
        const parent = ensureNode(node.slug.slice(0, -1));
        if (!parent.children.includes(node)) {
            parent.children.push(node);
        }
    });

    const sortNodes = (items: DocNavItem[]) => {
        items.sort((a, b) => {
            const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return a.title.localeCompare(b.title);
        });
        items.forEach((item) => sortNodes(item.children));
    };

    const root = ensureNode([]);
    sortNodes(root.children);
    return root.children;
};

const PipelineFlow = dynamic(() => import('../../components/pipelineFlow'), {
    ssr: false,
});

export default function DocPage({doc, navItems, docLookup}: DocPageProps) {
    const router = useRouter();
    const [docState, setDocState] = useState(doc);
    const description = buildDescription(docState);
    const isPipelineDoc = docState.slug.join('/') === 'content-pipeline';
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const activeStep = PIPELINE_STEPS[activeStepIndex];
    const contentRef = useRef<HTMLDivElement | null>(null);
    const {items: headingItems, activeId} = useHeadingIndex(
        contentRef,
        {selector: 'h2, h3', targetRatio: 0.22},
        [docState.slug.join('/')],
    );
    useEffect(() => {
        if (!isPipelineDoc || !isPlaying) return;
        const interval = window.setInterval(() => {
            setActiveStepIndex((prev) => (prev + 1) % PIPELINE_STEPS.length);
        }, 4200);
        return () => window.clearInterval(interval);
    }, [isPipelineDoc, isPlaying]);
    useEffect(() => {
        setDocState(doc);
    }, [doc.route]);
    const handleDocSelect = useCallback((route: string | null) => {
        if (!route) return;
        const targetPath = route.replace(/\/$/, '') || '/docs';
        const cachedDoc = docLookup[targetPath];
        if (cachedDoc) {
            setDocState(cachedDoc);
        }
        if (typeof window !== 'undefined') {
            window.history.pushState({}, '', route);
        }
    }, [docLookup]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleLocationChange = () => {
            const rawPath = window.location.pathname ?? '';
            const targetPath = rawPath.replace(/\/$/, '') || '/docs';
            if (!targetPath.startsWith('/docs') || targetPath === docState.route) {
                return;
            }
            const cachedDoc = docLookup[targetPath];
            if (cachedDoc) {
                setDocState(cachedDoc);
                return;
            }
            const slugPath = targetPath.replace(/^\/docs\/?/, '');
            if (!slugPath) return;
            const requestPath = `/api/docs?slug=${encodeURIComponent(slugPath)}`;
            fetch(requestPath)
                .then((response) => (response.ok ? response.json() : null))
                .then((payload) => {
                    if (payload?.doc) {
                        setDocState(payload.doc as DocData);
                    }
                })
                .catch((error) => {
                    if (error?.name !== 'AbortError') {
                        console.warn('Doc refresh failed.', error);
                    }
                });
        };
        window.addEventListener('popstate', handleLocationChange);
        handleLocationChange();
        return () => {
            window.removeEventListener('popstate', handleLocationChange);
        };
    }, [docLookup, docState.route]);
    return (
        <Layout description={description} showSectionIndex={false} key={docState.route}>
            <Head>
                <title>{`${docState.title} - Jerrett Davis`}</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Docs</p>
                <h1 className={styles.title}>{docState.title}</h1>
                {docState.description && (
                    <p className={styles.subtitle}>{docState.description}</p>
                )}
                <div className={styles.heroActions}>
                    <Link href="/docs" className={`${styles.primaryLink} glowable`}>
                        Back to docs
                    </Link>
                    <Link href="/" className={`${styles.secondaryLink} glowable`}>
                        Home
                    </Link>
                </div>
                {docState.updated && (
                    <div className={styles.metaRow}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Last updated</span>
                            <span className={styles.metaValue}>{docState.updated}</span>
                        </div>
                    </div>
                )}
            </section>
            <section className={styles.docLayout} key={docState.route}>
                <aside className={styles.docNav} aria-label="Documentation navigation">
                    <div className={styles.docNavTitle}>Docs</div>
                    <Link href="/docs" className={styles.docNavHome}>
                        Documentation home
                    </Link>
                    <nav>
                        <ul className={styles.docNavList}>
                            {navItems.map((item) => (
                                <DocNavNode
                                    key={item.slug.join('/')}
                                    item={item}
                                    activeSlug={docState.slug}
                                    depth={0}
                                    onSelect={handleDocSelect}
                                />
                            ))}
                        </ul>
                    </nav>
                </aside>
                <div className={styles.docMain}>
                    {isPipelineDoc && (
                        <section className={styles.pipelineSection}>
                            <div className={styles.pipelineHeader}>
                                <div>
                                    <p className={styles.kicker}>Pipeline map</p>
                                    <h2 className={styles.sectionTitle}>Content flow</h2>
                                    <p className={styles.sectionLead}>
                                        Interactive view of the markdown-to-deploy pipeline, including parallel lanes.
                                    </p>
                                </div>
                                <div className={styles.pipelineMeta}>
                                    <span className={styles.pipelineMetaLabel}>Active step</span>
                                    <span className={styles.pipelineMetaValue}>{activeStep.label}</span>
                                </div>
                            </div>
                            <div className={styles.pipelineControls}>
                                <button
                                    type="button"
                                    className={`${styles.pipelineControlButton} glowable`}
                                    onClick={() => setIsPlaying((prev) => !prev)}
                                    aria-pressed={isPlaying}
                                    aria-label={isPlaying ? 'Pause pipeline animation' : 'Play pipeline animation'}
                                >
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <span className={styles.pipelineStepBadge}>
                                    Step {activeStepIndex + 1} / {PIPELINE_STEPS.length}
                                </span>
                            </div>
                            <div className={styles.pipelineCard}>
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
                            <ol className={styles.pipelineTimeline} aria-label="Pipeline steps">
                                {PIPELINE_STEPS.map((step, index) => (
                                    <li
                                        key={step.id}
                                        className={styles.pipelineTimelineItem}
                                        data-active={index === activeStepIndex ? 'true' : undefined}
                                    >
                                        <button
                                            type="button"
                                            className={`${styles.pipelineTimelineButton} glowable`}
                                            onClick={() => {
                                                setActiveStepIndex(index);
                                                setIsPlaying(false);
                                            }}
                                            aria-current={index === activeStepIndex ? 'step' : undefined}
                                        >
                                            <span className={styles.pipelineTimelineIndex}>
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <span className={styles.pipelineTimelineLabel}>{step.label}</span>
                                            <span className={styles.pipelineTimelineTitle}>{step.title}</span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                            <div className={styles.pipelineNote}>
                                Click a node to focus a step and see its lane highlighted.
                            </div>
                        </section>
                    )}
                    <section className={styles.page}>
                        <div
                            ref={contentRef}
                            className={styles.content}
                            dangerouslySetInnerHTML={{__html: docState.contentHtml}}
                            key={docState.route}
                        />
                    </section>
                </div>
                <aside className={styles.docToc} aria-label="On this page">
                    <div className={styles.docTocTitle}>On this page</div>
                    {headingItems.length > 0 ? (
                        <ul className={styles.docTocList}>
                            {headingItems.map((item) => (
                                <li
                                    key={item.id}
                                    className={styles.docTocItem}
                                    data-level={item.level}
                                    data-active={activeId === item.id ? 'true' : undefined}
                                >
                                    <a
                                        href={`#${item.id}`}
                                        className={styles.docTocLink}
                                        aria-current={activeId === item.id ? 'true' : undefined}
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={styles.docTocEmpty}>No sections detected yet.</p>
                    )}
                </aside>
            </section>
        </Layout>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const slugs = await getAllDocSlugs();
    const paths = slugs.map((slug) => ({
        params: {slug},
    }));
    return {
        paths,
        fallback: false,
    };
};

export const getStaticProps: GetStaticProps<DocPageProps> = async ({params}) => {
    const slugParam = params?.slug ?? [];
    const slug = Array.isArray(slugParam) ? slugParam : [slugParam];
    const [doc, summaries] = await Promise.all([
        getDocBySlug(slug),
        getAllDocSummaries(),
    ]);
    const docs = await Promise.all(
        summaries.map((summary) => getDocBySlug(summary.slug)),
    );
    const docLookup = docs.reduce<Record<string, DocData>>((acc, entry) => {
        acc[entry.route] = entry;
        return acc;
    }, {});
    const navItems = buildDocTree(summaries);

    return {
        props: {
            doc,
            navItems,
            docLookup,
        },
    };
};

const DocNavNode = ({
    item,
    depth,
    activeSlug,
    onSelect,
}: {
    item: DocNavItem;
    depth: number;
    activeSlug: string[];
    onSelect?: (route: string | null) => void;
}) => {
    const activeKey = activeSlug.join('/');
    const itemKey = item.slug.join('/');
    const isActive = itemKey === activeKey;
    const isBranchActive = activeKey.startsWith(itemKey) && itemKey.length > 0;
    const hasChildren = item.children.length > 0;

    return (
        <li
            className={styles.docNavItem}
            data-active={isActive ? 'true' : undefined}
            data-branch={isBranchActive ? 'true' : undefined}
            style={{'--doc-depth': depth} as CSSProperties}
        >
            {item.route ? (
                <a
                    href={item.route}
                    className={styles.docNavLink}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={(event) => {
                        if (!onSelect) return;
                        if (
                            event.defaultPrevented
                            || event.button !== 0
                            || event.metaKey
                            || event.altKey
                            || event.ctrlKey
                            || event.shiftKey
                        ) {
                            return;
                        }
                        event.preventDefault();
                        onSelect(item.route);
                    }}
                >
                    {item.title}
                </a>
            ) : (
                <span className={styles.docNavGroup}>{item.title}</span>
            )}
            {hasChildren && (
                <ul className={styles.docNavList}>
                    {item.children.map((child) => (
                        <DocNavNode
                            key={child.slug.join('/')}
                            item={child}
                            depth={depth + 1}
                            activeSlug={activeSlug}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};
