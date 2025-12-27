#!/usr/bin/env node

/**
 * Hashnode reconciliation script
 *
 * Builds .syndication-state.json using existing Hashnode posts and optionally
 * deletes duplicates. Designed for backfilling state when posts were published
 * outside the syndication workflow.
 *
 * Usage:
 *   node scripts/syndication/reconcileHashnode.mjs [--dry-run] [--delete]
 */

import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldDelete = args.includes('--delete');

const normalize = (value) =>
    value ? value.trim().toLowerCase().replace(/\/$/, '') : '';

const loadJson = async (filePath, fallback) => {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT' && fallback) return fallback;
        throw error;
    }
};

const saveJson = async (filePath, data) => {
    await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
};

const loadConfig = async () => {
    const configPath = path.join(rootDir, '.syndication.config.json');
    return await loadJson(configPath);
};

const loadState = async () => {
    const statePath = path.join(rootDir, '.syndication-state.json');
    return await loadJson(statePath, {posts: {}});
};

const loadLocalPosts = async () => {
    const {default: matter} = await import('gray-matter');
    const postsDir = path.join(rootDir, 'posts');
    const files = await fs.readdir(postsDir);
    const posts = [];

    for (const file of files) {
        if (!file.endsWith('.mdx')) continue;
        const id = file.replace(/\.mdx$/, '');
        const content = await fs.readFile(path.join(postsDir, file), 'utf-8');
        const {data} = matter(content);
        posts.push({
            id,
            title: typeof data.title === 'string' ? data.title.trim() : id,
        });
    }

    return posts;
};

const fetchHashnodePosts = async (publicationId, token) => {
    const posts = [];
    let cursor = null;
    let hasNextPage = true;

    const query = `
        query($id: ObjectId!, $after: String) {
            publication(id: $id) {
                posts(first: 50, after: $after) {
                    edges {
                        node {
                            id
                            title
                            url
                            canonicalUrl
                            publishedAt
                            updatedAt
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
    `;

    while (hasNextPage) {
        const body = JSON.stringify({
            query,
            variables: {id: publicationId, after: cursor},
        });

        const response = await fetch('https://gql.hashnode.com', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: token,
            },
            body,
        });

        const payload = await response.json();
        if (payload.errors) {
            throw new Error(`Hashnode query failed: ${JSON.stringify(payload.errors)}`);
        }

        const edges = payload.data?.publication?.posts?.edges ?? [];
        edges.forEach((edge) => posts.push(edge.node));
        const pageInfo = payload.data?.publication?.posts?.pageInfo;
        hasNextPage = Boolean(pageInfo?.hasNextPage);
        cursor = pageInfo?.endCursor ?? null;
    }

    return posts;
};

const removeHashnodePost = async (token, postId) => {
    const mutation = `
        mutation($input: RemovePostInput!) {
            removePost(input: $input) {
                post { id title url }
            }
        }
    `;

    const response = await fetch('https://gql.hashnode.com', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: token,
        },
        body: JSON.stringify({query: mutation, variables: {input: {id: postId}}}),
    });

    const payload = await response.json();
    if (payload.errors) {
        throw new Error(`Hashnode remove failed: ${JSON.stringify(payload.errors)}`);
    }

    return payload.data?.removePost?.post ?? null;
};

const pickOldest = (items) => {
    return [...items].sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.publishedAt || b.updatedAt || 0).getTime();
        return dateA - dateB;
    });
};

const reconcile = async () => {
    const token = process.env.HASHNODE_API_TOKEN;
    if (!token) {
        throw new Error('HASHNODE_API_TOKEN is required to reconcile Hashnode posts.');
    }

    const config = await loadConfig();
    const publicationId = config?.platforms?.hashnode?.publicationId;
    if (!publicationId) {
        throw new Error('Hashnode publicationId is missing from .syndication.config.json.');
    }

    const canonicalBase = config?.defaults?.canonicalUrlBase ?? 'https://jerrettdavis.com';
    const state = await loadState();
    const localPosts = await loadLocalPosts();
    const hashnodePosts = await fetchHashnodePosts(publicationId, token);

    const byCanonical = new Map();
    hashnodePosts.forEach((post) => {
        const canonical = normalize(post.canonicalUrl);
        if (!canonical) return;
        const list = byCanonical.get(canonical) ?? [];
        list.push(post);
        byCanonical.set(canonical, list);
    });

    const byTitle = new Map();
    hashnodePosts.forEach((post) => {
        const title = normalize(post.title);
        if (!title) return;
        const list = byTitle.get(title) ?? [];
        list.push(post);
        byTitle.set(title, list);
    });

    const duplicates = [];
    const missing = [];

    for (const post of localPosts) {
        const canonical = normalize(`${canonicalBase}/blog/posts/${post.id}`);
        const titleKey = normalize(post.title);
        const candidates = [
            ...(byCanonical.get(canonical) ?? []),
            ...(byTitle.get(titleKey) ?? []),
        ];

        const uniqueCandidates = Array.from(new Map(candidates.map((item) => [item.id, item])).values());
        if (uniqueCandidates.length === 0) {
            missing.push(post.id);
            continue;
        }

        const sorted = pickOldest(uniqueCandidates);
        const keep = sorted[0];
        const extras = sorted.slice(1);

        if (!state.posts[post.id]) state.posts[post.id] = {};
        state.posts[post.id].hashnode = {
            id: keep.id,
            url: keep.url,
            publishedAt: keep.publishedAt ?? new Date().toISOString(),
            lastUpdated: keep.updatedAt ?? keep.publishedAt ?? new Date().toISOString(),
        };

        extras.forEach((item) => {
            duplicates.push({
                postId: post.id,
                hashnodeId: item.id,
                url: item.url,
                publishedAt: item.publishedAt,
            });
        });
    }

    if (!isDryRun) {
        await saveJson(path.join(rootDir, '.syndication-state.json'), state);
    }

    console.log(`✅ Reconciled ${localPosts.length - missing.length} posts`);
    if (missing.length > 0) {
        console.log(`⚠️  Missing posts: ${missing.join(', ')}`);
    }
    if (duplicates.length > 0) {
        console.log(`⚠️  Found ${duplicates.length} duplicates`);
        duplicates.forEach((duplicate) => {
            console.log(`  - ${duplicate.postId}: ${duplicate.url} (${duplicate.hashnodeId})`);
        });
    }

    if (shouldDelete && duplicates.length > 0) {
        console.log('🧹 Removing duplicates from Hashnode...');
        for (const duplicate of duplicates) {
            const removed = await removeHashnodePost(token, duplicate.hashnodeId);
            console.log(`  🗑️  Removed ${removed?.title ?? duplicate.hashnodeId}`);
        }
    }

    return {duplicates, missing};
};

reconcile().catch((error) => {
    console.error('❌ Hashnode reconcile failed:', error);
    process.exit(1);
});
