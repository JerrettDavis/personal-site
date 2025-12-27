import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout';
import {GetStaticProps} from 'next';
import {DocData, DocSummary, getAllDocSummaries, getDocBySlug} from '../../lib/docs';
import styles from './docs.module.css';

interface DocsIndexProps {
    intro: DocData;
    docs: DocSummary[];
}

const buildDescription = (intro: DocData) =>
    intro.description && intro.description.trim().length > 0
        ? intro.description
        : 'Technical documentation for the personal site.';

export default function DocsIndex({intro, docs}: DocsIndexProps) {
    const description = buildDescription(intro);
    return (
        <Layout description={description}>
            <Head>
                <title>{`${intro.title} - Jerrett Davis`}</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Docs</p>
                <h1 className={styles.title}>{intro.title}</h1>
                {intro.description && (
                    <p className={styles.subtitle}>{intro.description}</p>
                )}
            </section>
            <section className={styles.page}>
                <div
                    className={styles.content}
                    dangerouslySetInnerHTML={{__html: intro.contentHtml}}
                />
                <div>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Documentation map</h2>
                        <p className={styles.sectionLead}>
                            Each page covers a specific slice of the architecture and tooling.
                        </p>
                    </div>
                    <div className={styles.docGrid}>
                        {docs.map((doc) => (
                            <Link
                                href={doc.route}
                                className={`${styles.docCard} glowable`}
                                key={doc.route}
                            >
                                <span className={styles.docTitle}>{doc.title}</span>
                                {doc.description && (
                                    <p className={styles.docSummary}>{doc.description}</p>
                                )}
                                <span className={styles.docMeta}>{doc.route}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </Layout>
    );
}

export const getStaticProps: GetStaticProps<DocsIndexProps> = async () => {
    const [intro, summaries] = await Promise.all([
        getDocBySlug([]),
        getAllDocSummaries(),
    ]);
    const docs = summaries.filter((doc) => doc.slug.length > 0);

    return {
        props: {
            intro,
            docs,
        },
    };
};
