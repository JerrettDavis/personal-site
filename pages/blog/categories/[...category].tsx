import {GetStaticPaths, GetStaticProps} from "next";
import {PostSummary} from "../../../lib/posts";
import Layout, {PageType} from "../../../components/layout";
import Head from "next/head";
import utilStyles from "../../../styles/utils.module.css";
import Link from "next/link";
import Date from "../../../components/date";
import styled from "@emotion/styled";
import {Category, getAllCategories, getCategoryData, getPostsForCategory} from "../../../lib/categories";
import PostSummaries from "../../../components/postSummaries";


const Tag = styled.div`
  display: inline-block;
  color: var(--color-text-deemphasized);
  padding: 0 4px 8px 0;
  margin: 0 8px 4px 0;
  font-size: .7em;
`;

export default function PostCategory(
    {
        categoryData,
        postData
    }: {
        categoryData: Category,
        postData: PostSummary[]
    }) {
    const shortName = categoryData.categoryName.split('/').pop();
    const title = `Posts in ${shortName} - the overengineer. - Jerrett Davis`;
    return (
        <Layout pageType={PageType.BlogPost}>
            <Head>
                <title>{title}</title>
            </Head>
            <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
                <h1>the overengineer.</h1>
                <section>
                    <h2 className={utilStyles.headingLg}>Most Recent Posts in {shortName}</h2>
                    <PostSummaries postSummaries={postData} />
                </section>
            </section>
        </Layout>
    )
}


export const getStaticPaths: GetStaticPaths = async () => {
    const paths = (await getAllCategories())
        .map(p => {
            return {
                params: {
                    category: p.categoryPath.split('/')
                }
            }
        });

    return {
        paths,
        fallback: false
    }
}

export const getStaticProps: GetStaticProps = async ({params}) => {
    const postData = await getPostsForCategory((params.category as string[]).join('/'));
    const categoryData = await getCategoryData((params.category as string[]).join('/'));
    return {
        props: {
            categoryData: categoryData,
            postData: postData
        }
    }
}