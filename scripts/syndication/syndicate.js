#!/usr/bin/env node

/**
 * Syndication Script
 * 
 * This script syndicates blog posts to external platforms (Hashnode, Dev.to)
 * based on configuration and post frontmatter settings.
 * 
 * Environment Variables Required:
 * - HASHNODE_API_TOKEN: API token for Hashnode
 * - DEVTO_API_KEY: API key for Dev.to
 * 
 * Usage:
 *   node scripts/syndication/syndicate.js [--dry-run] [--force] [--post=<post-id>]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const specificPost = args.find(arg => arg.startsWith('--post='))?.split('=')[1];

/**
 * Load JSON file with error handling
 */
async function loadJson(filePath, defaultValue = null) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'ENOENT' && defaultValue !== null) {
            return defaultValue;
        }
        throw error;
    }
}

/**
 * Save JSON file with formatting
 */
async function saveJson(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Load syndication configuration
 */
async function loadConfig() {
    const configPath = path.join(rootDir, '.syndication.config.json');
    return await loadJson(configPath);
}

/**
 * Load syndication state
 */
async function loadState() {
    const statePath = path.join(rootDir, '.syndication-state.json');
    return await loadJson(statePath, { posts: {} });
}

/**
 * Save syndication state
 */
async function saveState(state) {
    const statePath = path.join(rootDir, '.syndication-state.json');
    await saveJson(statePath, state);
}

/**
 * Load all posts from the posts directory
 */
async function loadPosts() {
    const { default: matter } = await import('gray-matter');
    const postsDir = path.join(rootDir, 'posts');
    const files = await fs.readdir(postsDir);
    
    const posts = [];
    for (const file of files) {
        if (!file.endsWith('.mdx')) continue;
        
        const postId = file.replace(/\.mdx$/, '');
        const fullPath = path.join(postsDir, file);
        const content = await fs.readFile(fullPath, 'utf-8');
        const { data: frontmatter, content: markdown } = matter(content);
        
        posts.push({
            id: postId,
            frontmatter,
            markdown,
            file
        });
    }
    
    return posts;
}

/**
 * Check if a post should be syndicated based on configuration and frontmatter
 */
function shouldSyndicate(post, config) {
    const { frontmatter } = post;
    
    // Explicit frontmatter override
    if (frontmatter.syndicate === false) {
        return false;
    }
    
    if (frontmatter.syndicate === true) {
        return true;
    }
    
    // Check default setting
    if (!config.defaults.syndicateByDefault) {
        return false;
    }
    
    // Check tag filters
    const postTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
    if (config.filters.excludedTags && config.filters.excludedTags.length > 0) {
        const hasExcludedTag = postTags.some(tag => 
            config.filters.excludedTags.includes(tag)
        );
        if (hasExcludedTag) return false;
    }
    
    if (config.filters.includedTags && config.filters.includedTags.length > 0) {
        const hasIncludedTag = postTags.some(tag => 
            config.filters.includedTags.includes(tag)
        );
        if (!hasIncludedTag) return false;
    }
    
    // Check category filters
    const postCategories = Array.isArray(frontmatter.categories) ? frontmatter.categories : [];
    if (config.filters.excludedCategories && config.filters.excludedCategories.length > 0) {
        const hasExcludedCategory = postCategories.some(cat => 
            config.filters.excludedCategories.includes(cat)
        );
        if (hasExcludedCategory) return false;
    }
    
    if (config.filters.includedCategories && config.filters.includedCategories.length > 0) {
        const hasIncludedCategory = postCategories.some(cat => 
            config.filters.includedCategories.includes(cat)
        );
        if (!hasIncludedCategory) return false;
    }
    
    return true;
}

/**
 * Convert markdown content to platform-specific format
 */
function prepareContent(post, config, platform) {
    const { frontmatter, markdown } = post;
    const canonicalUrl = `${config.defaults.canonicalUrlBase}/blog/${post.id}`;
    
    // Add canonical URL notice at the top
    const notice = `> This article was originally published on [my blog](${canonicalUrl}).\n\n`;
    
    return {
        title: frontmatter.title,
        content: notice + markdown,
        canonicalUrl,
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        publishedAt: frontmatter.date
    };
}

/**
 * Publish to Hashnode using GraphQL API
 */
async function publishToHashnode(post, config, state) {
    const token = process.env.HASHNODE_API_TOKEN;
    if (!token) {
        throw new Error('HASHNODE_API_TOKEN environment variable is required');
    }
    
    const platformConfig = config.platforms.hashnode;
    if (!platformConfig.enabled) {
        return { skipped: true, reason: 'Platform disabled' };
    }
    
    if (!platformConfig.publicationId) {
        throw new Error('Hashnode publicationId is required in config');
    }
    
    const existingState = state.posts[post.id]?.hashnode;
    if (existingState && !isForce) {
        return { skipped: true, reason: 'Already published', url: existingState.url };
    }
    
    if (isDryRun) {
        console.log(`  [DRY RUN] Would publish to Hashnode`);
        return { skipped: true, reason: 'Dry run' };
    }
    
    const prepared = prepareContent(post, config, 'hashnode');
    
    // GraphQL mutation for Hashnode
    const mutation = `
        mutation PublishPost($input: PublishPostInput!) {
            publishPost(input: $input) {
                post {
                    id
                    url
                    publishedAt
                }
            }
        }
    `;
    
    const variables = {
        input: {
            title: prepared.title,
            contentMarkdown: prepared.content,
            publicationId: platformConfig.publicationId,
            tags: prepared.tags.slice(0, 5).map(tag => ({ slug: tag, name: tag })),
            ...(platformConfig.supportsBackdating && prepared.publishedAt ? {
                publishedAt: new Date(prepared.publishedAt).toISOString()
            } : {})
        }
    };
    
    const response = await fetch('https://gql.hashnode.com', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token
        },
        body: JSON.stringify({ query: mutation, variables })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hashnode API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.errors) {
        throw new Error(`Hashnode GraphQL error: ${JSON.stringify(result.errors)}`);
    }
    
    const postData = result.data.publishPost.post;
    
    return {
        success: true,
        id: postData.id,
        url: postData.url,
        publishedAt: postData.publishedAt,
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Publish to Dev.to using REST API
 */
async function publishToDevTo(post, config, state) {
    const apiKey = process.env.DEVTO_API_KEY;
    if (!apiKey) {
        throw new Error('DEVTO_API_KEY environment variable is required');
    }
    
    const platformConfig = config.platforms.devto;
    if (!platformConfig.enabled) {
        return { skipped: true, reason: 'Platform disabled' };
    }
    
    const existingState = state.posts[post.id]?.devto;
    if (existingState && !isForce) {
        return { skipped: true, reason: 'Already published', url: existingState.url };
    }
    
    if (isDryRun) {
        console.log(`  [DRY RUN] Would publish to Dev.to`);
        return { skipped: true, reason: 'Dry run' };
    }
    
    const prepared = prepareContent(post, config, 'devto');
    
    const article = {
        title: prepared.title,
        body_markdown: prepared.content,
        published: true,
        tags: prepared.tags.slice(0, 4), // Dev.to allows max 4 tags
        canonical_url: prepared.canonicalUrl
    };
    
    const response = await fetch('https://dev.to/api/articles', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey
        },
        body: JSON.stringify({ article })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dev.to API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    return {
        success: true,
        id: String(result.id),
        url: result.url,
        publishedAt: result.published_at || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Main syndication function
 */
async function syndicate() {
    console.log('🔄 Starting syndication process...\n');
    
    if (isDryRun) {
        console.log('🧪 DRY RUN MODE - No actual publications will be made\n');
    }
    
    // Load configuration and state
    const config = await loadConfig();
    const state = await loadState();
    const posts = await loadPosts();
    
    console.log(`📚 Found ${posts.length} posts\n`);
    
    // Filter posts if specific post requested
    const postsToProcess = specificPost 
        ? posts.filter(p => p.id === specificPost)
        : posts;
    
    if (specificPost && postsToProcess.length === 0) {
        console.error(`❌ Post not found: ${specificPost}`);
        process.exit(1);
    }
    
    let publishedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const post of postsToProcess) {
        console.log(`📝 Processing: ${post.id}`);
        
        if (!shouldSyndicate(post, config)) {
            console.log(`  ⏭️  Skipped (syndication disabled)\n`);
            skippedCount++;
            continue;
        }
        
        // Initialize post state if not exists
        if (!state.posts[post.id]) {
            state.posts[post.id] = {};
        }
        
        // Publish to Hashnode
        if (config.platforms.hashnode?.enabled) {
            try {
                console.log(`  📤 Publishing to Hashnode...`);
                const result = await publishToHashnode(post, config, state);
                
                if (result.skipped) {
                    console.log(`  ⏭️  Skipped: ${result.reason}`);
                    if (result.url) console.log(`  🔗 ${result.url}`);
                    skippedCount++;
                } else if (result.success) {
                    console.log(`  ✅ Published to Hashnode`);
                    console.log(`  🔗 ${result.url}`);
                    state.posts[post.id].hashnode = result;
                    publishedCount++;
                }
            } catch (error) {
                console.error(`  ❌ Error publishing to Hashnode: ${error.message}`);
                errorCount++;
            }
        }
        
        // Publish to Dev.to
        if (config.platforms.devto?.enabled) {
            try {
                console.log(`  📤 Publishing to Dev.to...`);
                const result = await publishToDevTo(post, config, state);
                
                if (result.skipped) {
                    console.log(`  ⏭️  Skipped: ${result.reason}`);
                    if (result.url) console.log(`  🔗 ${result.url}`);
                    skippedCount++;
                } else if (result.success) {
                    console.log(`  ✅ Published to Dev.to`);
                    console.log(`  🔗 ${result.url}`);
                    state.posts[post.id].devto = result;
                    publishedCount++;
                }
            } catch (error) {
                console.error(`  ❌ Error publishing to Dev.to: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log('');
    }
    
    // Save state
    if (!isDryRun) {
        await saveState(state);
        console.log('💾 State saved\n');
    }
    
    // Summary
    console.log('📊 Summary:');
    console.log(`  ✅ Published: ${publishedCount}`);
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    
    if (errorCount > 0) {
        console.log('\n⚠️  Some posts failed to syndicate. Check errors above.');
        process.exit(1);
    }
    
    console.log('\n✨ Syndication complete!');
}

// Run the script
syndicate().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});
