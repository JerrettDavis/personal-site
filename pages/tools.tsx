import Head from "next/head";
import Layout from "../components/layout";
import styles from "./tools.module.css";
import {TOOL_CATEGORIES} from "../data/tools";

export default function Tools() {
    const lede = 'A curated, low-maintenance overview of the hardware, software, and gadgets I lean on to build and write.';
    return (
        <Layout description={lede} containerVariant="wide">
            <Head>
                <title>Tools - Jerrett Davis</title>
            </Head>
            <section className={styles.hero}>
                <p className={styles.kicker}>Tools</p>
                <h1 className={styles.title}>The toolkit behind the work</h1>
                <p className={styles.lede}>
                    {lede}
                </p>
            </section>
            <section className={styles.categoryGrid}>
                {TOOL_CATEGORIES.map((category) => (
                    <article className={styles.categoryCard} key={category.title}>
                        <h2 className={styles.categoryTitle}>{category.title}</h2>
                        <p className={styles.categoryDescription}>{category.description}</p>
                        <ul className={styles.toolList}>
                            {category.items.map((item) => (
                                <li className={styles.toolItem} key={item.name}>
                                    <span className={styles.toolName}>{item.name}</span>
                                    {item.description && (
                                        <p className={styles.toolDescription}>{item.description}</p>
                                    )}
                                    {item.groups && item.groups.length > 0 && (
                                        <div className={styles.detailGroups}>
                                            {item.groups.map((group) => (
                                                <div className={styles.detailGroup} key={group.label}>
                                                    <span className={styles.detailLabel}>{group.label}</span>
                                                    <ul className={styles.detailList}>
                                                        {group.items.map((detail) => (
                                                            <li className={styles.detailItem} key={detail}>
                                                                {detail}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </section>
        </Layout>
    );
}
