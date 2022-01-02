import Head from "next/head";
import Layout from "../components/layout";

export default function AboutMe() {
    return (
        <Layout>
            <Head>
                <title>About Me - Jerrett Davis</title>
            </Head>
            <div>
                <section>
                    <h1>About Me</h1>
                    <div>
                        <p>
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
                            <a href="https://www.linkedin.com/in/jddpro/" target="_blank">LinkedIn</a>.
                        </p>
                    </div>
                </section>
                <section>
                    <h2>My Experience</h2>
                    <p>
                        I have listed my previous positions and roles of note below. For a more in depth look, check out{' '}
                        my <a href="https://www.linkedin.com/in/jddpro/" target="_blank">LinkedIn</a>.
                    </p>
                    <section>
                        <h3>Enduro Pipeline Services</h3>
                        <p>// TODO</p>
                    </section>
                    <section>
                        <h3>CareATC</h3>
                        <p>// TODO</p>
                    </section>
                    <section>
                        <h3>eLynx Technologies</h3>
                        <p>// TODO</p>
                    </section>
                </section>
                <section>
                    <h2>My Interests</h2>
                    <p>
                        Due to my love of learning, I've amassed an impressive trove of hobbies and interests, and while
                        some are technical, many are not!
                    </p>
                </section>

            </div>
        </Layout>
    )
}
