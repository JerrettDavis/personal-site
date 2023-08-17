import {GetStaticPaths, GetStaticProps} from "next";
import {PostSummary} from "../../../lib/posts";
import {getAllTagIds, getPostsForTag} from "../../../lib/tags";
import Layout, {PageType} from "../../../components/layout";
import Head from "next/head";
import utilStyles from "../../../styles/utils.module.css";
import Link from "next/link";
import Date from "../../../components/date";
import styled from "@emotion/styled";
import {Category, getAllCategories, getCategoryData} from "../../../lib/categories";


const Tag = styled.div`
  display: inline-block;
  color: var(--color-text-deemphasized);
  padding: 0 4px 8px 0;
  margin: 0 8px 4px 0;
  font-size: .7em;
`;

export default function PostCategory({
    category,
    categoryData,
    postData
}: {
    category: string,
    categoryData: Category,
    postData: PostSummary[]
}) {
    return (
        <Layout pageType={PageType.BlogPost}>
            <Head>
                <title>Posts in category {categoryData.categoryName} - the overengineer. - Jerrett Davis</title>
            </Head>
            <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
                <h1>the overengineer.</h1>
                <section>
                    <h2 className={utilStyles.headingLg}>Most Recent Posts in {categoryData.categoryName}</h2>
                    <ul className={utilStyles.list}>
                        {!!postData && postData.map(({id, stub, date, title, tags}) => (
                            <li className={utilStyles.listItem} key={id}>
                                <Link href={`/blog/posts/${id}`}>
                                    {title}
                                </Link>
                                <br/>
                                <small className={utilStyles.lightText}>
                                    <Date dateString={date}/>
                                </small>
                                <br/>
                                <div>{stub}</div>
                                <div>
                                    {tags.map((t) => (
                                        <Link href={`/blog/categories/${t}`} key={t}>
                                            <Tag key={t}>#{t}</Tag>
                                        </Link>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
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

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const postData = null;
    const categoryData = await getCategoryData((params.category as string[]).join('/'));
    return {
        props: {
            category: params.category,
            categoryData: categoryData,
            postData
        }
    }
}