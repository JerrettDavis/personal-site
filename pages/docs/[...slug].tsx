import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout';
import dynamic from 'next/dynamic';
import {GetStaticPaths, GetStaticProps} from 'next';
import {useEffect, useState} from 'react';
import {DocData, getAllDocSlugs, getDocBySlug} from '../../lib/docs';
import {PIPELINE_EDGES, PIPELINE_LANES, PIPELINE_NODES, PIPELINE_STEPS} from '../../data/pipelineFlow';
import styles from './docs.module.css';

interface DocPageProps {
    doc: DocData;
}

const buildDescription = (doc: DocData) =>
    doc.description && doc.description.trim().length > 0
        ? doc.description
        : `${doc.title} documentation.`;

const PipelineFlow = dynamic(() => import('../../components/pipelineFlow'), {
    ssr: false,
});

export default function DocPage({doc}: DocPageProps) {
    const description = buildDescription(doc);
    const isPipelineDoc = doc.slug.join('/') === 'content-pipeline';
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const activeStep = PIPELINE_STEPS[activeStepIndex];

    useEffect(() => {
        if (!isPipelineDoc || !isPlaying) return;
        const interval = window.setInterval(() => {
            setActiveStepIndex((prev) => (prev + 1) % PIPELINE_STEPS.length);
        }, 4200);
        return () => window.clearInterval(interval);
    }, [isPipelineDoc, isPlaying]);
    return (
        <Layout description={description}>
            <Head>
                <title>{`${doc.title} - Jerrett Davis`}</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Docs</p>
                <h1 className={styles.title}>{doc.title}</h1>
                {doc.description && (
                    <p className={styles.subtitle}>{doc.description}</p>
                )}
                <div className={styles.heroActions}>
                    <Link href="/docs" className={`${styles.primaryLink} glowable`}>
                        Back to docs
                    </Link>
                    <Link href="/" className={`${styles.secondaryLink} glowable`}>
                        Home
                    </Link>
                </div>
                {doc.updated && (
                    <div className={styles.metaRow}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Last updated</span>
                            <span className={styles.metaValue}>{doc.updated}</span>
                        </div>
                    </div>
                )}
            </section>
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
                    className={styles.content}
                    dangerouslySetInnerHTML={{__html: doc.contentHtml}}
                />
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
    const doc = await getDocBySlug(slug);

    return {
        props: {
            doc,
        },
    };
};
