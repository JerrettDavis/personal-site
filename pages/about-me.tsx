import Head from "next/head";
import Layout from "../components/layout";
import styles from './about-me.module.css';

export default function AboutMe() {
    const aboutDescription = 'Full-stack engineer based in Tulsa, focused on scalable systems, architecture, and a wide range of hobbies.';
    return (
        <Layout description={aboutDescription}>
            <Head>
                <title>About Me - Jerrett Davis</title>
            </Head>
            <div>
                <section>
                    <h1 className={styles.articlePad}>About Me</h1>
                    <div>
                        <p >
                            I am a full-stack software engineer currently based in Tulsa, Oklahoma. I graduated from{' '}
                            Rogers State University with a B.S. in Business Information Technology, with a focus in software
                            engineering. While in college, I discovered my love for architecting increasingly complex, scalable
                            systems. As such, much of my professional work has revolved around building decoupled, distributed,
                            and scalable infrastructure.
                        </p>
                        <p>
                            While I will discuss my professional experience here, I do not intend for this
                            to be a professional bio. I'm hoping to take a bit more of a casual, friendly tone here.{' '}
                            If you would like a more business-oriented biography, please take a look a my{' '}
                            <a href="https://www.linkedin.com/in/jddpro/" target="_blank" rel="noreferrer">LinkedIn</a>.
                        </p>
                    </div>
                </section>
                <section>
                    <h2 className={styles.articlePad}>My Interests</h2>
                    <p >
                        Due to my love of learning, I've amassed an impressive trove of hobbies and interests, and while
                        some are technical, many are not! There's always something that can be gained by adding more skills
                        to your arsenal, even if you never intend to enjoy them at more than a hobbyist level. Below, I've
                        listed some of my favorite hobbies and a small blurb about each.
                    </p>
                    <section>
                        <h3 className={styles.articlePad}>Technical Interests</h3>
                        <section>
                            <h4 className={styles.articlePad}>System Architecture</h4>
                            <p >
                                Even as a child, I spent more time taking my toys apart than actually playing with them. I've
                                always loved trying to figure out what makes things tick. As such, I'm fascinated by systems
                                at scale. I love craft more and more elegant solutions to problems, preferably in a way that
                                allows them to naturally evolve over time.
                            </p>
                        </section>
                        <section>
                            <h4 className={styles.articlePad}>IoT</h4>
                            <p >
                                The more I dig into the Internet of Things, the more enthralled I become. I've been slowly
                                working on transforming my home into an entirely self-managed smart home. While I do still
                                rely on several third party utilities, I'm hoping to one day have an entirely self-hosted
                                and self-managed smart home setup!
                            </p>
                        </section>
                        <section>
                            <h4 className={styles.articlePad}>Gaming</h4>
                            <p>
                                In many ways, video games were my first real application of programming. While I had dabbled in
                                HTML and CSS prior to picking up desktop programming, building game clients and bots are what
                                really solidified my interest in the field. To date, I've still never built any games of my own,
                                but I've built plenty of mods and plugins!
                            </p>
                        </section>
                        <section>
                            <h4 className={styles.articlePad}>3D Printing</h4>
                            <p>
                                3D printing is the latest in my ever growing series of hobbies. I initially bought the printer
                                as a way of replacing a few long-since-discontinued mounting clips for some blinds, but I find
                                myself looking for excuses to use the printer whenever I can. And since I can't leave a good thing
                                alone, I've tweaked and modified my original printer enough that it's scarcely recognizable as a
                                descendent of its original donor frame.
                            </p>
                        </section>
                    </section>
                    <section>
                        <h3 className={styles.articlePad}>Non-Technical Interests</h3>
                        <section>
                            <h4 className={styles.articlePad}>Photography</h4>
                            <p>
                                I picked up a DSLR for the first time out of necessity. I was needing some photos for a
                                website I was working on, but I had no access to stock photos for the project. As I was
                                still in high school, I was able to borrow a camera from the art department. Immediately
                                after clicking the shutter for the first time, I was hooked. In only a few short months,
                                I managed to saved up enough money to get an entry level DSLR of my own. I've
                                shot weddings, family portraits, senior portraits, and tons more. These days, I still take
                                photos for friends occasionally, but I mostly shoot for myself.
                            </p>
                        </section>
                        <section>
                            <h4 className={styles.articlePad}>Cooking</h4>
                            <p>
                                Do you know why developers like cooking? You don't one day wake up and realize that your carrots
                                have been upgraded to version 3.5, and your peeler is only compatible with carrots version
                                3.4 and older. With that said, I've certainly introduced enough gadgets to my kitchen that
                                it's beginning to border on insanity. My Sous Vide has Wifi and Bluetooth. Seriously.
                            </p>
                        </section>
                        <section>
                            <h4 className={styles.articlePad}>Crocheting</h4>
                            <p>
                                Alright, I'll admit it. I threw this one in just to show how discombobulated my hobbies
                                have been. I actually took up crocheting a couple years ago when my wife's father was
                                undergoing cancer treatments, and she needed to be away for several months to help take
                                care of things. As it turns out, crocheting is a perfect way to pass the time, plug you
                                get to make everyone all kinds of nifty wearables. <em>Maybe I should try making IoT beanies.</em>
                            </p>
                        </section>
                    </section>
                </section>
                <section>
                    <h2 className={styles.articlePad}>My Experience</h2>
                    <p>
                        I have listed my previous positions and roles of note below. For a more in depth look, check out{' '}
                        my <a href="https://www.linkedin.com/in/jddpro/" target="_blank" rel="noreferrer">LinkedIn</a>.
                    </p>
                    <section>
                        <h3 className={styles.articlePad}>Enduro Pipeline Services</h3>
                        <div>Sept 2019 - Dec 2021</div>
                        <p>
                            Enduro Pipeline Services specializes in the design, fabrication, and running of pipeline pigging
                            tools. The vast majority of the tools in use were written in-house. Since many of the tools were
                            written and maintained in-house, some had begun to show their age and needed revitalizing. I
                            was brought in to help bring in some external expertise.
                        </p>
                        <p>
                            During my time at Enduro, I helped implement Continuous Integration, Docker, and a variety of
                            other technologies. One of my first core responsibilities was to implement a secure, scalable,
                            self-provisioning, multi-tenant webapp. This webapp allowed us to showcase a variety of new
                            technologies and approaches, such as structured logging, integration tests, and Entity Framework.
                        </p>
                        <p>
                            I later converted a legacy JSP-based webapp that underpinned many of the day-to-day operations
                            to an Angular and Dotnet 6-based webapp. This migration was extensive, and along with leveraging
                            entirely new technologies, the database required a complete overhaul. Despite reusing no code,
                            and completely normalizing the database, the deployment to th new application resulted in no
                            downtime or data loss.
                        </p>
                    </section>
                    <section>
                        <h3 className={styles.articlePad}>CareATC</h3>
                        <div>May 2016 - Sept 2019</div>
                        <p>
                            CareATC is a company specializing in on-site and near-site healthcare clinics for companies who
                            wish to increase doctor availability for their employees, while also lowering healthcare costs by
                            identifying and managing chronic conditions. I joined CareATC during one of its major transition
                            periods as a .Net Software Engineer.
                        </p>
                        <p>
                            While I was initially recruited to focus on expanding our reporting infrastructure, my UI/UX
                            experience lead to me being involved in many projects. After some time, I got assigned the
                            title <em>Architectural Lead</em>. This role lead to me being the primary point of contact for
                            all architectural decisions moving forward. In my capacity as an architectural lead, I oversaw
                            the conceptualization and completion of several internal and external projects. Among the projects
                            I'm most proud of are: the implementation of Continuous Integration and Deployment, the breaking
                            of our monoliths into microservices, and the transition to SOLID principles.
                        </p>
                    </section>
                    <section>
                        <h3 className={styles.articlePad}>eLynx Technologies</h3>
                        <div>Apr 2015 - May 2016</div>
                        <p>
                            eLynx Technologies is a technology company specializing in developing software for the oil and gas{' '}
                            industry. Their cornerstone product, SCADALynx, allows for live monitoring and reporting of remote
                            industrial mechanical equipment. At eLynx, I operated as a <em>.Net Support Developer</em>. Despite its{' '}
                            name, this role specialized in developing internal support tools for the customer support staff.
                        </p>
                        <p>
                            In my capacity as a support developer, I got the opportunity to be hands-on with rather large scale data.{' '}
                            I primarily developed tools that allowed internal support staff to operate as <em>power users</em>, outside
                            of the normal SCADALynx application. The tools I developed allowed users to make broad, sweeping changes,
                            across many customer systems, without incurring any sort of downtime. It also allowed for custom reporting
                            that was not present in the custom-facing application.
                        </p>
                        <p>
                            Outside of developing new tools for the support team, I also assisted in migrating the support tool from on-
                            premise databases to Azure-hosted databases. This migration was fraught with challenges, including necessitating
                            a full rewrite of all the internal SQL in the support tools. This challenge afforded us the opportunity to
                            implemented an ORM, simplifying future transformations!
                        </p>
                    </section>
                </section>
            </div>
        </Layout>
    )
}
