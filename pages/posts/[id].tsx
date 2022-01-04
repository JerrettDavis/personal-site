import Layout from '../../components/layout'
import PostData, { getAllPostIds, getPostData } from '../../lib/posts'
import Head from 'next/head'
import Date from '../../components/date'
import utilStyles from '../../styles/utils.module.css'
import { GetStaticProps, GetStaticPaths } from 'next'
import styled from "@emotion/styled";

const Tag = styled.div`
  display: inline-block;
  border-color: var(--color-primary) !important;
  border: 1px solid;
  padding: 8px 16px;
  margin: 0 8px;
`;

const TagContainer = styled.div`
  margin-top: 3rem;
`;

export default function Post({
         postData
     }: {
    postData: PostData
}) {
    return (
        <Layout>
            <Head>
                <title>{postData.title}</title>
            </Head>
            <article>
                <h1 className={utilStyles.headingXl}>{postData.title}</h1>
                <div className={utilStyles.lightText}>
                    <Date dateString={postData.date} />
                </div>
                <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
                {!!postData.tags && (
                    <TagContainer>
                        {postData.tags.map(t =>
                            <Tag key={t}>#{t}</Tag>)}
                    </TagContainer>
                )}
            </article>
        </Layout>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const paths = getAllPostIds()
    return {
        paths,
        fallback: false
    }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const postData = await getPostData(params.id as string)
    return {
        props: {
            postData
        }
    }
}
