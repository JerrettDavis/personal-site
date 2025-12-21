import Layout, {PageType} from '../../../components/layout'
import PostData, {getAllPostIds, getPostData, getSeriesDataForPost, SeriesData} from '../../../lib/posts'
import Head from 'next/head'
import Date from '../../../components/date'
import utilStyles from '../../../styles/utils.module.css'
import {GetStaticPaths, GetStaticProps} from 'next'
import styled from "@emotion/styled";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {faClock} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import Image from "next/image";

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

const SeriesContainer = styled.div`
  margin: 2.5rem 0 1.5rem;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
`;

const SeriesTitle = styled.div`
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const SeriesNav = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.9em;
`;

const SeriesList = styled.ol`
  margin: 0;
  padding-left: 1.25rem;
`;

const SeriesItem = styled.li`
  margin-bottom: 0.35rem;
  &[data-active="true"] {
    font-weight: bold;
    color: var(--color-text-primary);
  }
`;

const author = 'Jerrett Davis';

export default function Post({
         postData,
         seriesData,
     }: {
    postData: PostData
    seriesData: SeriesData | null
}) {
    const previousPost = seriesData?.posts[seriesData.currentIndex - 1];
    const nextPost = seriesData?.posts[seriesData.currentIndex + 1];
    const description = (postData.description && postData.description.trim().length > 0)
        ? postData.description
        : postData.stub;
    return (
        <Layout pageType={PageType.BlogPost} description={description}>
            <Head>
                <title>{postData.title}</title>
            </Head>
            <article>
                <h1 className={utilStyles.headingXl}>{postData.title}</h1>
                {postData.featured && (
                    <Image
                        width={940}
                        height={470}
                        src={postData.featured}
                        alt={postData.title}
                    />
                )}
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
                {seriesData && (
                    <SeriesContainer>
                        <SeriesTitle>
                            Series: {seriesData.name} (Part {seriesData.currentIndex + 1} of {seriesData.posts.length})
                        </SeriesTitle>
                        <SeriesNav>
                            {previousPost && (
                                <Link href={`/blog/posts/${previousPost.id}`}>
                                    Prev: {previousPost.title}
                                </Link>
                            )}
                            {nextPost && (
                                <Link href={`/blog/posts/${nextPost.id}`}>
                                    Next: {nextPost.title}
                                </Link>
                            )}
                        </SeriesNav>
                        <SeriesList>
                            {seriesData.posts.map((post, index) => (
                                <SeriesItem key={post.id} data-active={index === seriesData.currentIndex}>
                                    <Link href={`/blog/posts/${post.id}`}>
                                        {index + 1}. {post.title}
                                    </Link>
                                </SeriesItem>
                            ))}
                        </SeriesList>
                    </SeriesContainer>
                )}
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
    const [postData, seriesData] = await Promise.all([
        getPostData(params.id as string),
        getSeriesDataForPost(params.id as string),
    ])
    return {
        props: {
            postData,
            seriesData: seriesData ?? null,
        }
    }
}
