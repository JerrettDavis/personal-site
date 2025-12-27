# Blog Post Syndication

This document describes the blog post syndication system that automatically publishes posts to external platforms (Hashnode and Dev.to) while maintaining your site as the canonical source.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

## Overview

The syndication system is designed to:

- **Automatically publish** posts to Hashnode and Dev.to after they're published on your site
- **Respect post preferences** through frontmatter controls
- **Track publication state** to avoid duplicate posts
- **Handle errors gracefully** without blocking your main deployment
- **Support backdating** where platforms allow it
- **Maintain canonical URLs** pointing back to your site

### Key Features

✅ **Pluggable Architecture** - Easy to add new platforms  
✅ **Frontmatter Control** - Per-post syndication settings  
✅ **Tag/Category Filtering** - Control which posts get syndicated  
✅ **State Tracking** - Never publish the same post twice  
✅ **Fault Tolerant** - Errors don't break your deployment  
✅ **Dry Run Mode** - Test before publishing  
✅ **Manual Override** - Force re-publish or publish specific posts  

## Setup

### 1. Get API Keys

#### Hashnode

1. Go to [Hashnode](https://hashnode.com/) and log in
2. Navigate to Settings → Developer
3. Generate a new Personal Access Token
4. Copy the token (keep it secret!)
5. Get your Publication ID:
   - Go to your blog dashboard
   - Click on Settings
   - Your publication ID is in the URL or settings

#### Dev.to

1. Go to [Dev.to](https://dev.to/) and log in
2. Navigate to Settings → Account → DEV Community API Keys
3. Generate a new API key
4. Copy the key (keep it secret!)

### 2. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Add the following secrets:
   - `HASHNODE_API_TOKEN`: Your Hashnode personal access token
   - `DEVTO_API_KEY`: Your Dev.to API key

### 3. Configure Syndication

Edit `.syndication.config.json` in the root of your repository:

```json
{
  "platforms": {
    "hashnode": {
      "enabled": true,
      "publicationId": "YOUR_HASHNODE_PUBLICATION_ID",
      "supportsBackdating": true
    },
    "devto": {
      "enabled": true,
      "supportsBackdating": false
    }
  },
  "filters": {
    "includedTags": [],
    "excludedTags": ["draft", "private"],
    "includedCategories": [],
    "excludedCategories": ["Private"]
  },
  "defaults": {
    "syndicateByDefault": true,
    "canonicalUrlBase": "https://jerrettdavis.com"
  }
}
```

### 4. Enable the Workflow

The workflow is automatically enabled once you push the `.github/workflows/syndicate.yml` file. It will run:

- Automatically when you push changes to `posts/**` or `.syndication.config.json`
- Manually via the Actions tab (with optional parameters)

## Configuration

### Global Settings (`.syndication.config.json`)

#### Platform Configuration

```json
{
  "platforms": {
    "hashnode": {
      "enabled": true,              // Enable/disable Hashnode
      "publicationId": "...",       // Your publication ID
      "supportsBackdating": true    // Whether to use original dates
    }
  }
}
```

#### Filters

Control which posts get syndicated based on tags and categories:

```json
{
  "filters": {
    "includedTags": ["javascript", "webdev"],  // Only these tags (empty = all)
    "excludedTags": ["draft", "private"],      // Never these tags
    "includedCategories": ["Programming"],      // Only these categories (empty = all)
    "excludedCategories": ["Personal"]          // Never these categories
  }
}
```

**Filter Logic:**
1. If `excludedTags` contains any post tag → Skip
2. If `includedTags` is not empty and post has no included tags → Skip
3. If `excludedCategories` contains any post category → Skip
4. If `includedCategories` is not empty and post has no included categories → Skip
5. Otherwise → Syndicate (if other conditions met)

#### Defaults

```json
{
  "defaults": {
    "syndicateByDefault": true,                    // Default syndication behavior
    "canonicalUrlBase": "https://jerrettdavis.com" // Your site's base URL
  }
}
```

### Per-Post Settings (Frontmatter)

Add a `syndicate` field to your post's frontmatter to control syndication:

```yaml
---
title: 'My Awesome Post'
date: '2024-01-01'
syndicate: true  # Explicitly enable syndication for this post
---
```

**Options:**
- `syndicate: true` - Always syndicate this post (overrides filters)
- `syndicate: false` - Never syndicate this post
- Omit field - Use default behavior from config

**Example:** Disable syndication for a specific post

```yaml
---
title: 'Draft Post - Work in Progress'
date: '2024-01-01'
tags: ['webdev', 'javascript']
syndicate: false  # Don't syndicate even though tags match
---
```

## How It Works

### Workflow Trigger

1. You push a new post or update to the `main` branch
2. The main deployment happens (Vercel builds and deploys your site)
3. The syndication workflow triggers (after deployment)
4. Posts are published to configured platforms

### Publication Process

For each post that should be syndicated:

1. **Check state**: Has this post already been published?
2. **Check filters**: Should this post be syndicated?
3. **Check frontmatter**: Does the post explicitly opt in/out?
4. **Prepare content**: Add canonical URL notice, format for platform
5. **Publish**: Call platform API
6. **Update state**: Record publication URL and timestamp
7. **Commit state**: Save `.syndication-state.json` back to repo

### State Tracking

The `.syndication-state.json` file tracks what's been published:

```json
{
  "posts": {
    "my-post-slug": {
      "hashnode": {
        "id": "platform-post-id",
        "url": "https://hashnode.com/...",
        "publishedAt": "2024-01-01T00:00:00Z",
        "lastUpdated": "2024-01-01T00:00:00Z"
      },
      "devto": {
        "id": "12345",
        "url": "https://dev.to/...",
        "publishedAt": "2024-01-01T00:00:00Z",
        "lastUpdated": "2024-01-01T00:00:00Z"
      }
    }
  }
}
```

This file is committed to your repository, so the state is version-controlled.

## Usage

### Automatic Syndication

Simply push your changes to `main`. The workflow will automatically:
- Detect new or updated posts
- Syndicate eligible posts
- Update the state file

### Manual Syndication

#### Run from GitHub Actions UI

1. Go to Actions tab
2. Select "Syndicate Posts" workflow
3. Click "Run workflow"
4. Configure options:
   - **Dry run**: Test without actually publishing
   - **Force**: Re-publish already published posts
   - **Post ID**: Syndicate only a specific post

#### Run locally

```bash
# Dry run (see what would be published)
npm run syndicate:dry-run

# Publish all eligible posts
npm run syndicate

# Force re-publish already published posts
npm run syndicate -- --force

# Publish a specific post
npm run syndicate -- --post=my-post-slug

# Combine options
npm run syndicate -- --force --post=my-post-slug
```

**Local Requirements:**
- Set environment variables: `HASHNODE_API_TOKEN` and `DEVTO_API_KEY`
- Run from project root directory

### Backposting

To syndicate all historical posts that haven't been published yet:

1. Run the workflow manually (or push a change)
2. The script automatically finds all posts that:
   - Should be syndicated based on filters and frontmatter
   - Haven't been published yet (not in state file)
3. Posts are published with backdate if platform supports it

## Troubleshooting

### Posts Not Being Syndicated

**Check these in order:**

1. **Is the post eligible?**
   ```bash
   # Run dry-run to see which posts would be published
   npm run syndicate:dry-run
   ```

2. **Check frontmatter**: Does the post have `syndicate: false`?

3. **Check filters**: Does the post have excluded tags/categories?

4. **Check state**: Is the post already in `.syndication-state.json`?
   - Use `--force` to re-publish

5. **Check workflow logs**: Go to Actions tab → Syndicate Posts → Latest run

### API Errors

#### Hashnode Errors

**"Invalid token"**
- Verify `HASHNODE_API_TOKEN` secret is set correctly
- Generate a new token if needed

**"Publication not found"**
- Check `publicationId` in `.syndication.config.json`
- Verify you have access to the publication

**"Rate limit exceeded"**
- Hashnode has rate limits
- Wait and retry later
- Consider syndicating in smaller batches

#### Dev.to Errors

**"Unauthorized"**
- Verify `DEVTO_API_KEY` secret is set correctly
- Generate a new API key if needed

**"Too many tags"**
- Dev.to allows max 4 tags
- The script automatically limits to 4, but check your posts

**"Duplicate article"**
- Dev.to detects duplicate content
- Check if you already published this post manually
- Use `--force` flag if you want to update

### Workflow Failures

If the syndication workflow fails:

1. **Check the error message** in the workflow logs
2. **Don't worry about deployment** - syndication errors don't affect your site
3. **Fix the issue** and retry:
   - Run workflow manually from Actions tab
   - Or push a trivial change to trigger it again

The workflow creates an issue automatically if it fails, with troubleshooting steps.

### State File Conflicts

If multiple syndications run simultaneously (rare), you might get state file conflicts:

1. Pull the latest changes: `git pull`
2. Review `.syndication-state.json` for conflicts
3. Resolve conflicts (keep both publications if both succeeded)
4. Commit and push

### Reset State

To force re-syndication of all posts:

```bash
# Backup current state
cp .syndication-state.json .syndication-state.json.backup

# Reset state
echo '{"posts":{}}' > .syndication-state.json

# Run with force flag
npm run syndicate -- --force

# If something goes wrong, restore backup
cp .syndication-state.json.backup .syndication-state.json
```

## Architecture

### Design Principles

1. **Separation of Concerns**
   - Configuration in JSON files
   - Business logic in syndication script
   - Orchestration in GitHub Actions
   - No syndication logic in the main site code

2. **Fail-Safe**
   - Syndication errors don't block deployment
   - Idempotent - safe to re-run
   - State tracked in version control

3. **Pluggable**
   - Easy to add new platforms
   - Each platform is independent
   - Platform-specific settings isolated

4. **Transparent**
   - Clear logging
   - State visible in repo
   - Workflow status in GitHub UI

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                         GitHub Actions                       │
│                                                              │
│  ┌────────────┐        ┌──────────────┐                    │
│  │   Push to  │───────▶│   Deploy     │                    │
│  │    main    │        │   (Vercel)   │                    │
│  └────────────┘        └──────────────┘                    │
│                              │                               │
│                              ▼                               │
│                        ┌──────────────┐                     │
│                        │  Syndicate   │                     │
│                        │  Workflow    │                     │
│                        └──────────────┘                     │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Syndication Script  │
                    └──────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
     ┌─────────┐        ┌──────────┐        ┌─────────┐
     │  Posts  │        │  Config  │        │  State  │
     │  (MDX)  │        │  (JSON)  │        │ (JSON)  │
     └─────────┘        └──────────┘        └─────────┘
           │                   │                   │
           └───────────────────┴───────────────────┘
                               │
           ┌───────────────────┴───────────────────┐
           │                                       │
           ▼                                       ▼
    ┌─────────────┐                        ┌─────────────┐
    │  Hashnode   │                        │   Dev.to    │
    │     API     │                        │     API     │
    └─────────────┘                        └─────────────┘
```

### File Structure

```
.
├── .github/workflows/
│   └── syndicate.yml              # GitHub Actions workflow
├── posts/                         # Blog posts (MDX)
├── scripts/syndication/
│   └── syndicate.js               # Main syndication script
├── schemas/
│   ├── syndication-config.schema.json
│   └── syndication-state.schema.json
├── .syndication.config.json       # Configuration
├── .syndication-state.json        # Publication state
└── SYNDICATION.md                 # This file
```

### Adding a New Platform

To add support for a new platform (e.g., Medium):

1. **Update config schema** (`schemas/syndication-config.schema.json`)
   ```json
   "medium": {
     "type": "object",
     "properties": {
       "enabled": { "type": "boolean" },
       "userId": { "type": "string" }
     }
   }
   ```

2. **Add platform config** (`.syndication.config.json`)
   ```json
   "medium": {
     "enabled": true,
     "userId": "YOUR_MEDIUM_USER_ID"
   }
   ```

3. **Implement publishing function** in `syndicate.js`
   ```javascript
   async function publishToMedium(post, config, state) {
     // Implementation
   }
   ```

4. **Add to main loop** in `syndicate()` function
   ```javascript
   if (config.platforms.medium?.enabled) {
     const result = await publishToMedium(post, config, state);
     // Handle result
   }
   ```

5. **Add API secret** to GitHub repository secrets

6. **Update workflow** to pass the secret

7. **Test** with dry-run first!

## Security

- **API keys are stored as GitHub Secrets** - never committed to the repo
- **Scripts run in GitHub Actions** - isolated environment
- **State file is safe to commit** - contains no secrets, only public URLs
- **Canonical URLs prevent duplicate content penalties**

## Best Practices

1. **Test with dry-run first**
   ```bash
   npm run syndicate:dry-run
   ```

2. **Start with a single post**
   ```bash
   npm run syndicate -- --post=my-test-post
   ```

3. **Review state file** after syndication
   ```bash
   git diff .syndication-state.json
   ```

4. **Monitor the first few runs** in GitHub Actions

5. **Set up notifications** for workflow failures

6. **Keep backups** of state file before major changes

7. **Document platform-specific quirks** you discover

## FAQ

**Q: Will this create duplicate content penalties?**  
A: No. Each syndicated post includes a canonical URL pointing back to your site, which tells search engines your site is the original source.

**Q: What happens if syndication fails?**  
A: Your site still deploys successfully. Syndication errors don't block deployment. You can retry later from the Actions tab.

**Q: Can I update a post after it's syndicated?**  
A: Currently, the system only creates new posts. Updating syndicated posts would require additional logic (and most platforms prefer not to modify published content).

**Q: How do I remove a syndicated post?**  
A: You'll need to delete it manually from each platform. Then update `.syndication-state.json` to remove that post's entry if you want to re-publish it.

**Q: Can I syndicate old posts?**  
A: Yes! Just run the syndication script. It will automatically find posts that haven't been syndicated yet. Hashnode supports backdating to preserve original dates.

**Q: How much does this cost?**  
A: $0. Both Hashnode and Dev.to have free APIs. GitHub Actions is free for public repos and has a generous free tier for private repos.

## Support

If you encounter issues:

1. Check this documentation first
2. Review workflow logs in GitHub Actions
3. Try running locally with `--dry-run` for debugging
4. Check platform API status pages
5. Open an issue in the repository

## License

This syndication system is part of your personal site and follows the same license as the rest of your repository.
