import Head from "next/head";
import Layout from "../components/layout";
import styles from './about-me.module.css';
import Link from "next/link";

export default function AboutMe() {
    const aboutDescription = 'Full-stack engineer based in Tulsa, focused on scalable systems, architecture, and a wide range of hobbies.';
    return (
        <Layout description={aboutDescription}>
            <Head>
                <title>About Me - Jerrett Davis</title>
            </Head>
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroIntro}>
                        <p className={styles.kicker}>About</p>
                        <h1 className={styles.heroTitle}>Jerrett Davis</h1>
                        <p className={styles.heroSubtitle}>
                            Full-stack engineer based in Tulsa, Oklahoma, focused on scalable systems, automation, and developer
                            experience.
                        </p>
                        <div className={styles.heroActions}>
                            <a
                                href="https://www.linkedin.com/in/jddpro/"
                                target="_blank"
                                rel="noreferrer"
                                className={styles.primaryLink}
                            >
                                LinkedIn
                            </a>
                            <Link href="/projects" className={styles.secondaryLink}>
                                Projects
                            </Link>
                            <Link href="/blog" className={styles.secondaryLink}>
                                Blog
                            </Link>
                        </div>
                    </div>
                    <div className={styles.heroCard}>
                        <h2 className={styles.cardTitle}>Snapshot</h2>
                        <ul className={styles.metaList}>
                            <li>
                                <span className={styles.metaLabel}>Based in</span>
                                <span>Tulsa, Oklahoma</span>
                            </li>
                            <li>
                                <span className={styles.metaLabel}>Focus</span>
                                <span>Architecture, automation, developer experience</span>
                            </li>
                            <li>
                                <span className={styles.metaLabel}>Background</span>
                                <span>B.S. Business IT, software engineering focus</span>
                            </li>
                        </ul>
                        <div className={styles.tagRow}>
                            <span className={styles.tag}>Systems</span>
                            <span className={styles.tag}>Automation</span>
                            <span className={styles.tag}>DX</span>
                            <span className={styles.tag}>Learning</span>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Story</h2>
                    <div className={styles.sectionContent}>
                        <p>
                            I graduated from Rogers State University with a B.S. in Business Information Technology, focused on
                            software engineering. While in college I fell in love with architecting scalable systems, and most of
                            my professional work has centered on decoupled, distributed infrastructure that stays clean as it
                            grows.
                        </p>
                        <p>
                            This page is meant to be casual and human. If you want a more formal bio, you can always head to my{' '}
                            <a href="https://www.linkedin.com/in/jddpro/" target="_blank" rel="noreferrer">LinkedIn</a>.
                        </p>
                        <p className={styles.sectionNote}>
                            When I am not working, I am usually tinkering in the <Link href="/hobbies">hobbies</Link> lab or
                            refining the <Link href="/tools">tools</Link> that power my workflow.
                        </p>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Focus areas</h2>
                        <p className={styles.sectionLead}>
                            The themes I come back to most often, both at work and in personal projects.
                        </p>
                    </div>
                    <div className={styles.cardGrid}>
                        <article className={styles.card}>
                            <h3 className={styles.cardHeading}>Architecture at scale</h3>
                            <p>
                                Clear boundaries, evolvable systems, and the kind of structure that keeps teams moving fast.
                            </p>
                        </article>
                        <article className={styles.card}>
                            <h3 className={styles.cardHeading}>Automation and reliability</h3>
                            <p>
                                CI/CD, self-serve tooling, and reducing friction so the important work stays in focus.
                            </p>
                        </article>
                        <article className={styles.card}>
                            <h3 className={styles.cardHeading}>Learning and sharing</h3>
                            <p>
                                Writing, teaching, and documenting the work so others can build on it.
                            </p>
                        </article>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Interests</h2>
                        <p className={styles.sectionLead}>
                            A mix of technical curiosities and off-hours obsessions.
                        </p>
                    </div>
                    <div className={styles.interestColumns}>
                        <div className={styles.interestGroup}>
                            <h3 className={styles.groupTitle}>Technical</h3>
                            <div className={styles.cardGrid}>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>System architecture</h4>
                                    <p>
                                        I have always loved taking things apart and figuring out how they tick, then
                                        rebuilding them with cleaner lines and clearer intent.
                                    </p>
                                </article>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>Automation and IoT</h4>
                                    <p>
                                        Smart homes, repeatable workflows, and anything that lets me delete a manual step.
                                    </p>
                                </article>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>Gaming</h4>
                                    <p>
                                        My gateway into coding. I still love RTS, MMORPGs, racing sims, and whatever hooks me.
                                    </p>
                                </article>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>3D printing</h4>
                                    <p>
                                        From one broken blind clip to a full printing bench of tweaks, mods, and prototypes.
                                    </p>
                                </article>
                            </div>
                        </div>
                        <div className={styles.interestGroup}>
                            <h3 className={styles.groupTitle}>Non-technical</h3>
                            <div className={styles.cardGrid}>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>Photography</h4>
                                    <p>
                                        Mostly landscapes and travel, with the occasional portrait session for friends.
                                    </p>
                                </article>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>Cooking</h4>
                                    <p>
                                        A mix of slow experiments, gadgets, and a questionable number of sauces.
                                    </p>
                                </article>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>Crocheting</h4>
                                    <p>
                                        A creative reset that turns downtime into cozy, wearable experiments.
                                    </p>
                                </article>
                                <article className={styles.card}>
                                    <h4 className={styles.cardHeading}>Cars</h4>
                                    <p>
                                        Always loved them. Fast, fun, and endlessly interesting to be around.
                                    </p>
                                </article>
                            </div>
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>Experience</h2>
                        <p className={styles.sectionLead}>
                            A quick look at roles and milestones. For full details, see{' '}
                            <a href="https://www.linkedin.com/in/jddpro/" target="_blank" rel="noreferrer">LinkedIn</a>.
                        </p>
                    </div>
                    <div className={styles.timeline}>
                        <article className={styles.timelineItem}>
                            <div className={styles.timelineCard}>
                                <div className={styles.timelineHeader}>
                                    <h3>Enduro Pipeline Services</h3>
                                    <span className={styles.timelineRange}>Sept 2019 - Dec 2021</span>
                                </div>
                                <p>
                                    Helped modernize in-house tooling for pipeline pigging operations and brought in external
                                    expertise to revitalize aging systems.
                                </p>
                                <p>
                                    Implemented CI, Docker, structured logging, and integration tests while building a secure,
                                    multi-tenant webapp to showcase new patterns and infrastructure.
                                </p>
                                <p>
                                    Migrated a legacy JSP app to Angular and .NET 6 with a fully normalized database and a
                                    no-downtime deployment.
                                </p>
                            </div>
                        </article>
                        <article className={styles.timelineItem}>
                            <div className={styles.timelineCard}>
                                <div className={styles.timelineHeader}>
                                    <h3>CareATC</h3>
                                    <span className={styles.timelineRange}>May 2016 - Sept 2019</span>
                                </div>
                                <p>
                                    Joined during a major transition and expanded reporting infrastructure across the org.
                                </p>
                                <p>
                                    Became Architectural Lead, guiding platform decisions, CI/CD adoption, and a monolith to
                                    microservices transition anchored in SOLID principles.
                                </p>
                            </div>
                        </article>
                        <article className={styles.timelineItem}>
                            <div className={styles.timelineCard}>
                                <div className={styles.timelineHeader}>
                                    <h3>eLynx Technologies</h3>
                                    <span className={styles.timelineRange}>Apr 2015 - May 2016</span>
                                </div>
                                <p>
                                    Built internal support tooling for large-scale industrial data and empowered support teams
                                    with power-user workflows and custom reporting.
                                </p>
                                <p>
                                    Assisted with migrating on-prem databases to Azure and introduced ORM tooling to simplify
                                    future transformations.
                                </p>
                            </div>
                        </article>
                    </div>
                </section>
            </div>
        </Layout>
    )
}
