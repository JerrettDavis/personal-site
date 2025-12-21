import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const rootDirectory = process.cwd();

// get sorted mdx post

export async function getSortedPost() {
    const postDirectory = path.join(rootDirectory, 'posts');

    const files = fs.readdirSync(postDirectory);

    const postLists = [];

    if (!files) return;

    files.forEach((file) => {
        const filePath = path.join(postDirectory, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(content);

        postLists.push({ ...data, slug: file.replace('.mdx', '') });
    });

    // Sort posts by date

    return postLists.sort((a, b) => {
        if (a.date < b.date) return 1;
        if (a.date > b.date) return -1;
        return 0;
    });
}

// get post type dir
export async function getPostDir() {
    return fs.readdirSync(path.join(rootDirectory, 'posts'));
}
