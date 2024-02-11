import {getSortedPost} from "./mdx";
import fs from "fs";
import {Feed} from "feed";

export default async function generateRssFeed() : Promise<void> {
    const production = process.env.NODE_ENV === 'production';
    const site_url = production ? 'https://jerrettdavis.com' : 'http://localhost:3000';
    const allPosts = await getSortedPost();
    const feedOptions = {
        title: 'Jerrett Davis | The Overengineer Blog Posts | RSS Feed',
        description: 'The Overengineer Blog. Anything worth doing is worth overdoing.',
        id: site_url,
        link: site_url,
        image: `${site_url}/profile.png`,
        favicon: `${site_url}/favicon.png`,
        copyright: `All rights reserved ${new Date().getFullYear()}, Jerrett Davis`,
        generator: 'Feed for Node.js',
        feedLinks: {
            rss2: `${site_url}/rss.xml`,
            json: `${site_url}/rss.json`,
            atom: `${site_url}/atom.xml`,
        },
    };

    const feed = new Feed(feedOptions);

    allPosts.forEach((post) => {
        feed.addItem({
            title: post.title,
            id: `${site_url}/blog/${post.slug}`,
            link: `${site_url}/blog/${post.slug}`,
            description: post.description,
            date: new Date(post.date),
        });
    });

    fs.writeFileSync('./public/rss.xml', feed.rss2());
    fs.writeFileSync('./public/rss.json', feed.json1());
    fs.writeFileSync('./public/atom.xml', feed.atom1());
}