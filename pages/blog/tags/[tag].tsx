import {GetStaticPaths, GetStaticProps} from "next";
import {PostSummary} from "../../../lib/posts";
import {getAllTagIds, getPostsForTag} from "../../../lib/tags";
import Layout, {PageType} from "../../../components/layout";
import Head from "next/head";
import utilStyles from "../../../styles/utils.module.css";
import PostSummaries from "../../../components/postSummaries";


export default function PostTag({
                                    tag,
                                    postData
                                }: {
    tag: string,
    postData: PostSummary[]
}) {
    return (
        <Layout pageType={PageType.BlogPost}>
            <Head>
                <title>Posts tagged with #{tag} - the overengineer. - Jerrett Davis</title>
            </Head>
            <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
                <h1>the overengineer.</h1>
                <section>
                    <h2 className={utilStyles.headingLg}>Most Recent Posts Tagged With #{tag}</h2>
                    <PostSummaries postSummaries={postData} selectedTag={tag}/>
                </section>
            </section>
        </Layout>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const paths = await getAllTagIds()
    return {
        paths,
        fallback: false
    }
}

export const getStaticProps: GetStaticProps = async ({params}) => {
    const postData = await getPostsForTag(params.tag as string)
    return {
        props: {
            tag: params.tag,
            postData
        }
    }
}
