import {getAllPostIds, getSortedPostsData} from '../lib/posts';

export async function getSortedPost() {
    const posts = await getSortedPostsData();
    return posts.map((post) => ({
        ...post,
        slug: post.id,
    }));
}

export async function getPostDir() {
    const ids = await getAllPostIds();
    return ids.map((entry) => `${entry.params.id}.mdx`);
}
