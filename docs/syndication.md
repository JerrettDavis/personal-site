---
title: Syndication
description: Automated cross-posting to Hashnode and Dev.to with canonical URLs.
order: 6
---
<div class="doc-callout">
  <div class="doc-callout-title">Publish once, syndicate everywhere</div>
  <div class="doc-callout-body">
    The syndication system automatically publishes blog posts to external platforms (Hashnode and 
    Dev.to) after deployment while maintaining canonical URLs that point back to this site. Posts 
    are tracked to prevent duplicates, and errors never block the main deployment.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Hashnode</span>
    <span class="doc-badge">Dev.to</span>
    <span class="doc-badge">Fault tolerant</span>
    <span class="doc-badge">Pluggable</span>
  </div>
</div>

## Key features
<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">Frontmatter control</div>
    <div class="doc-step-meta">Each post can opt in or out via <code>syndicate: true/false</code>.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Tag and category filters</div>
    <div class="doc-step-meta">Configure which posts to syndicate based on tags and categories.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">State tracking</div>
    <div class="doc-step-meta">Publication URLs and timestamps stored in <code>.syndication-state.json</code>.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Dry run mode</div>
    <div class="doc-step-meta">Test syndication logic without actually publishing content.</div>
  </li>
</ul>

## Setup

### Get API keys

**Hashnode:**
1. Navigate to [Hashnode](https://hashnode.com/) → Settings → Developer
2. Generate a Personal Access Token
3. Find your Publication ID in your blog's settings

**Dev.to:**
1. Navigate to [Dev.to](https://dev.to/) → Settings → Account → API Keys
2. Generate a new API key

### Add secrets to GitHub

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `HASHNODE_API_TOKEN`: Your Hashnode personal access token
   - `DEVTO_API_KEY`: Your Dev.to API key

### Configure platforms

Edit `.syndication.config.json` in the repository root:

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
    "includedCategories": [
      "Architecture",
      "Programming",
      "Programming/Architecture",
      "Programming/Automation",
      "Programming/Databases",
      "Programming/Fun",
      "Programming/Tooling",
      "Software Engineering"
    ],
    "excludedCategories": ["Personal", "Personal/Travel", "Private"]
  },
  "defaults": {
    "syndicateByDefault": true,
    "canonicalUrlBase": "https://jerrettdavis.com"
  }
}
```

## Configuration

### Platform settings

Each platform in the `platforms` object supports:
- `enabled`: Whether syndication is active for this platform
- `publicationId`: Platform-specific publication identifier (Hashnode only)
- `supportsBackdating`: Whether to preserve original publication dates

### Filter logic

Syndication filters determine post eligibility:

1. **Explicit frontmatter override**: `syndicate: true` always syndicates, `syndicate: false` never syndicates
2. **Excluded tags/categories**: Posts with these are skipped
3. **Included tags/categories**: If defined, posts must match at least one
4. **Default behavior**: Respects `syndicateByDefault` setting when no override exists

Example filter configuration:

```json
{
  "filters": {
    "includedTags": ["javascript", "webdev"],
    "excludedTags": ["draft", "private"],
    "includedCategories": ["Programming", "Software Engineering", "Architecture"],
    "excludedCategories": ["Personal", "Personal/Travel"]
  }
}
```

### Frontmatter control

Posts can explicitly opt in or out:

```yaml
---
title: 'My Post'
syndicate: false  # Prevents syndication regardless of filters
---
```

When omitted, configuration filters determine eligibility.

## How it works

### Workflow trigger

<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">01. Push to main</div>
    <div class="doc-step-meta">Changes to <code>posts/**</code> trigger the workflow.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">02. Main deployment</div>
    <div class="doc-step-meta">Vercel builds and deploys the site normally.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">03. Syndication runs</div>
    <div class="doc-step-meta">GitHub Actions executes the syndication script.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">04. State updated</div>
    <div class="doc-step-meta">Publication data committed back to repository.</div>
  </li>
</ul>

### Publication process

For each eligible post:

1. Check if already published (via state file)
2. Validate against filters and frontmatter
3. Prepare content with canonical URL notice
4. Call platform API (GraphQL for Hashnode, REST for Dev.to)
5. Record publication URL and timestamp
6. Commit state updates to repository

### State tracking

`.syndication-state.json` maintains publication history:

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

## Usage

### Command line

```bash
# Test without publishing
npm run syndicate:dry-run

# Publish all eligible posts
npm run syndicate

# Force re-publish already published posts
npm run syndicate -- --force

# Publish a specific post
npm run syndicate -- --post=my-post-slug
```

### Manual workflow trigger

1. Go to Actions tab in GitHub
2. Select "Syndicate Posts" workflow
3. Click "Run workflow"
4. Configure options:
   - **Dry run**: Test without publishing
   - **Force**: Re-publish existing posts
   - **Post ID**: Syndicate only specific post

### Automatic syndication

The workflow runs automatically when:
- You push changes to `posts/**` or `.syndication.config.json`
- Changes are merged to the `main` branch

## Troubleshooting

### Posts not syndicating

Check eligibility in order:

1. Run dry-run to see which posts would be published:
   ```bash
   npm run syndicate:dry-run
   ```

2. Verify post has no `syndicate: false` in frontmatter

3. Check if post tags/categories are excluded in config

4. Confirm post isn't already in `.syndication-state.json`
   - Use `--force` flag to re-publish

5. Review workflow logs in GitHub Actions

### API errors

**Hashnode errors:**
- `Invalid token`: Verify `HASHNODE_API_TOKEN` secret is correct
- `Publication not found`: Check `publicationId` in config
- `Rate limit exceeded`: Wait and retry later

**Dev.to errors:**
- `Unauthorized`: Verify `DEVTO_API_KEY` secret is correct
- `Too many tags`: Dev.to allows max 4 tags (automatically limited)
- `Duplicate article`: Post may already exist on platform

### Workflow failures

If syndication fails:
1. Check error message in workflow logs
2. Deployment proceeds normally (syndication errors don't block)
3. An issue is created automatically with troubleshooting steps
4. Retry manually from Actions tab or with next push

## Architecture

### Components

<div class="doc-diagram">
  <div class="doc-diagram-node">Configuration</div>
  <div class="doc-diagram-node">Syndication script</div>
  <div class="doc-diagram-node">State tracking</div>
  <div class="doc-diagram-node">GitHub Actions</div>
</div>

**Configuration** (`.syndication.config.json`):
- Platform settings and API endpoints
- Tag and category filters
- Default syndication behavior

**Syndication script** (`scripts/syndication/syndicate.mjs`):
- Loads posts and applies filtering logic
- Integrates with Hashnode GraphQL API
- Integrates with Dev.to REST API
- Handles errors and logging

**State tracking** (`.syndication-state.json`):
- Records publication URLs and timestamps
- Prevents duplicate syndication
- Version-controlled with repository

**GitHub Actions workflow** (`.github/workflows/syndicate.yml`):
- Triggers on posts changes or manual dispatch
- Runs after main deployment
- Commits state updates back to repo
- Creates issues on failure

### Design principles

The syndication system follows these core principles:

**Separation of concerns:**
- Configuration in JSON files
- Business logic in syndication script
- Orchestration in GitHub Actions
- No syndication code in main site

**Fault tolerance:**
- Syndication errors don't block deployment
- Safe to re-run (idempotent)
- State tracked in version control

**Pluggable:**
- Easy to add new platforms
- Platform-specific logic isolated
- Settings centralized in config

**Transparent:**
- Clear logging at each step
- State visible in repository
- Workflow status in GitHub UI

### Adding new platforms

To add support for a new platform:

1. Update `schemas/syndication-config.schema.json` with platform schema
2. Add platform configuration to `.syndication.config.json`
3. Implement publishing function in `scripts/syndication/syndicate.mjs`
4. Add platform case to main syndication loop
5. Update workflow to pass API secret
6. Test with dry-run mode

Example structure for new platform:

```javascript
async function publishToMedium(post, config, state) {
  const platformConfig = config.platforms.medium;
  if (!platformConfig.enabled) {
    return { skipped: true, reason: 'Platform disabled' };
  }
  
  const existingState = state.posts[post.id]?.medium;
  if (existingState && !isForce) {
    return { skipped: true, reason: 'Already published' };
  }
  
  if (isDryRun) {
    return { skipped: true, reason: 'Dry run' };
  }
  
  // API integration logic here
  
  return {
    success: true,
    id: result.id,
    url: result.url,
    publishedAt: result.publishedAt,
    lastUpdated: new Date().toISOString()
  };
}
```

## Security

<div class="doc-callout">
  <div class="doc-callout-title">API keys and canonical URLs</div>
  <div class="doc-callout-body">
    API keys are stored as GitHub Secrets and never committed to the repository. The state file 
    contains only public URLs. Canonical URLs prevent duplicate content penalties by identifying 
    this site as the original source.
  </div>
</div>

- API keys stored as GitHub Secrets (never in code)
- Scripts execute in isolated GitHub Actions environment
- State file contains no secrets (only public URLs)
- Canonical URLs prevent SEO penalties
- CodeQL scans detect vulnerabilities automatically

## Best practices

1. **Test with dry-run first** before enabling live syndication
2. **Start with one post** to validate API integration
3. **Review state file** after initial syndication
4. **Monitor workflow runs** in GitHub Actions
5. **Keep configuration simple** until you need advanced filters
6. **Document platform quirks** as you discover them
