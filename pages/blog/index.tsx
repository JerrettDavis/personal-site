import Layout from "../../components/layout";
import Head from "next/head";
import utilStyles from "../../styles/utils.module.css";
import Link from "next/link";
import Date from "../../components/date";
import {GetStaticProps} from "next";
import {getSortedPostsData, PostSummary} from "../../lib/posts";
import styled from "@emotion/styled";
import {getSortedTagsData, TagData} from "../../lib/tags";
import {Category, getAllCategories} from "../../lib/categories";
import BaseProps from "../index";

const Tag = styled.div`
  display: inline-block;
  color: var(--color-text-deemphasized);
  padding: 0 4px 8px 0;
  margin: 0 8px 4px 0;
  font-size: .7em;
`;

const BlogContent = styled.div`
  display: flex;
  flex-direction: row;
`;

const RightListContainer = styled.div`
  margin-left: 32px;
  font-size: 0.8em;
  flex-grow: 1;
`;

const RightListItem = styled.li`
  margin: 0 0 8px 0;
  white-space: nowrap;
`;

export default function Index(
    {
        postSummaries,
        tags,
        categories
    }: BlogIndexPropsModel) {
    return (
        <Layout>
            <Head>
                <title>the overengineer. - Jerrett Davis</title>
            </Head>
            <section className={`${utilStyles.headingMd} ${utilStyles.padding1px}`}>
                <h1>the overengineer.</h1>
                <section>
                    <p>
                        I've been told I have a penchant for <em>occasionally</em> over-engineering solutions to certain
                        problems.
                        On my ever-present mission for improvement, my struggles sometimes breathe life into new,
                        inventive ways to
                        solve challenges. However, more often than not, I'm left with something many friends have
                        affectionately
                        described as <em>cursed</em>.
                    </p>
                    <p>
                        As an exercise in self-reflection and as a digital manifestation of the idiom <em>"Misery loves
                        company"</em>,
                        I present my developer blog: <strong>the overengineer.</strong>
                    </p>
                    <p>
                        I also publish my posts on <a href="https://hashnode.jerrettdavis.com">Hashnode</a>.
                    </p>
                </section>
                <hr/>
                <BlogContent>
                    <section>
                        <h2 className={utilStyles.headingLg}>Latest Blog Posts</h2>
                        <ul className={utilStyles.list}>
                            {postSummaries.map(({id, stub, date, title, tags}) => (
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
                                            <Link href={`/blog/tags/${t}`} key={t}>
                                                <Tag key={t}>#{t}</Tag>
                                            </Link>
                                        ))}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                    {!!tags || !!categories
                        ?
                        <RightListContainer>
                            {createTagsIfPresent(tags)}
                            {createCategoriesIfPresent(categories)}
                        </RightListContainer>
                        : <></>
                    }
                </BlogContent>
            </section>
        </Layout>
    )
}

const createTagsIfPresent = (tags?: TagData[] | null | undefined) => {
    if (!!tags) {
        return (
            <div>
                <h2 className={utilStyles.headingLg}>Tags</h2>
                <ul className={utilStyles.list}>
                    {tags.map((tag) => (
                        <RightListItem className={utilStyles.listItem} key={tag.tagName}>
                            <Link href={`/blog/tags/${tag.tagName}`}>
                                #{tag.tagName}
                            </Link>
                        </RightListItem>
                    ))}
                </ul>
            </div>
        );
    } else {
        return <></>;
    }
}

const createCategoriesIfPresent = (categories?: Category[] | null | undefined) => {
    if(!!categories) {
        return (
            <div>
                <h2 className={utilStyles.headingLg}>Categories</h2>
                <ul className={utilStyles.list}>
                    {categories.map((category) => (
                        <RightListItem className={utilStyles.listItem} key={category.categoryName}>
                            <Link href={`/blog/categories/${category.categoryPath}`}>
                                {category.categoryName} ({category.count})
                            </Link>
                        </RightListItem>
                    ))}
                </ul>
            </div>
        );
    } else {
        return <></>;
    }
}

interface BlogIndexPropsModel {
    postSummaries: PostSummary[],
    tags: TagData[],
    categories: Category[],
}

interface BlogIndexProps extends BaseProps<BlogIndexPropsModel> {
}


export const getStaticProps: GetStaticProps = async (): Promise<BlogIndexProps> => {
    const postSummaries = await getSortedPostsData()
    const tags = await getSortedTagsData()
    const categories = await getAllCategories();
    return {
        props: {
            postSummaries: postSummaries,
            tags: tags,
            categories: categories
        }
    };
}
