import {GetStaticPaths, GetStaticProps} from "next";
import {getSortedPostsData} from "../../../lib/posts";
import {POSTS_PER_PAGE} from "../../../lib/blog-utils";
import {getSortedTagsData} from "../../../lib/tags";
import {getAllCategories} from "../../../lib/categories";
import BlogIndex, {BlogIndexPropsModel} from "../index";

export default BlogIndex;

export const getStaticPaths: GetStaticPaths = async () => {
    const totalPosts = (await getSortedPostsData()).length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
    const pages = Array.from({length: Math.max(0, totalPages - 1)}, (_, index) => ({
        params: {page: (index + 2).toString()}
    }));
    return {
        paths: pages,
        fallback: false
    };
};

export const getStaticProps: GetStaticProps<BlogIndexPropsModel> = async ({params}) => {
    const pageParam = Array.isArray(params?.page) ? params?.page[0] : params?.page;
    const pageNumber = Number(pageParam);
    if (!Number.isInteger(pageNumber) || pageNumber < 2) {
        return {notFound: true};
    }

    const [allPosts, tags, categories] = await Promise.all([
        getSortedPostsData(),
        getSortedTagsData(),
        getAllCategories(),
    ]);
    const totalPosts = allPosts.length;
    const totalPages = Math.max(1, Math.ceil(totalPosts / POSTS_PER_PAGE));
    if (pageNumber > totalPages) {
        return {notFound: true};
    }

    const startIndex = (pageNumber - 1) * POSTS_PER_PAGE;
    const postSummaries = allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);

    return {
        props: {
            postSummaries,
            tags,
            categories,
            currentPage: pageNumber,
            totalPages,
            totalPosts,
        }
    };
};
