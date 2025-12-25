import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout';
import {GetStaticPaths, GetStaticProps} from 'next';
import {DocData, getAllDocSlugs, getDocBySlug} from '../../lib/docs';
import styles from './docs.module.css';

interface DocPageProps {
    doc: DocData;
}

const buildDescription = (doc: DocData) =>
    doc.description && doc.description.trim().length > 0
        ? doc.description
        : `${doc.title} documentation.`;

export default function DocPage({doc}: DocPageProps) {
    const description = buildDescription(doc);
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
