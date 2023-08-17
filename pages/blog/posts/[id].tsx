import Layout, {PageType} from '../../../components/layout'
import PostData, {getAllPostIds, getPostData} from '../../../lib/posts'
import Head from 'next/head'
import Date from '../../../components/date'
import utilStyles from '../../../styles/utils.module.css'
import {GetStaticPaths, GetStaticProps} from 'next'
import styled from "@emotion/styled";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faClock} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

const Tag = styled.div`
  display: inline-block;
  color: var(--color-text-deemphasized);
  border-color: var(--color-border) !important;
  border: 1px solid;
  padding: 8px 16px;
  margin: 0 8px;
`;

const TagContainer = styled.div`
  margin-top: 3rem;
`;

const ArticleInfoContainer = styled.div`
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  margin: 8px 0;
  padding: 16px 0;
  display:flex;
  flex-direction: column;
`;

const AuthorName = styled.span`
  font-weight: bold;
`;

const PublishedOnBox = styled.span`
  font-size: .9em;
`

const BoldString = styled.span`
  font-weight: bold;
`
const ReadingTimeRow = styled.div`
  font-size:.9em;
`

const ReadingTime = (props) => {
    const time = Math.round(props.wordCount / 200);
    return (<>{time}</>);
}

const ReadingTimeDisplay = styled.span`
  margin-left: 16px;
`

const author = 'Jerrett Davis';

export default function Post({
         postData
     }: {
    postData: PostData
}) {
    console.log(postData);
    return (
        <Layout pageType={PageType.BlogPost}>
            <Head>
                <title>{postData.title}</title>
            </Head>
            <article>
                <h1 className={utilStyles.headingXl}>{postData.title}</h1>

                <ArticleInfoContainer>
                    <AuthorName>{author}</AuthorName>
                    <PublishedOnBox className={utilStyles.lightText}>
                        Published on <BoldString><Date dateString={postData.date} /></BoldString>
                    </PublishedOnBox>
                    <ReadingTimeRow className={utilStyles.lightText}>
                        <span>Word Count: <BoldString>{postData.wordCount?.toLocaleString()}</BoldString></span>
                        <ReadingTimeDisplay>
                            <FontAwesomeIcon height={14} width={14} icon={faClock} /> <ReadingTime wordCount={postData.wordCount} /> min read
                        </ReadingTimeDisplay>
                    </ReadingTimeRow>

                </ArticleInfoContainer>
                <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
                {!!postData.tags && (
                    <TagContainer>
                        {postData.tags.map(t =>
                            <Link href={`/blog/tags/${t}`} key={t}>
                                <Tag>#{t}</Tag>
                            </Link>)}
                    </TagContainer>
                )}
            </article>
        </Layout>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const paths = await getAllPostIds()
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
