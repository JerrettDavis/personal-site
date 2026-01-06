# GitHub Workflows

## GitHub Metrics Workflow

The `github-metrics.yml` workflow automatically updates GitHub metrics on a daily schedule.

### Problem

The workflow fails with the error "Changes must be made through a pull request" because the repository has branch protection rules that prevent direct commits to the main branch.

### Solutions

There are two ways to fix this issue:

#### Option 1: Use a Personal Access Token (Recommended)

Create a Personal Access Token (PAT) with bypass permissions:

1. **Create a Classic Personal Access Token (PAT)**:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a descriptive name like "Metrics Update Token"
   - Select expiration (recommend "No expiration" for automation)
   - Grant the following scopes:
     - **repo** (Full control of private repositories)
   - Generate the token and copy it
   - **Important**: The token must belong to a user with admin access to the repository

2. **Add the token as a repository secret**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `METRICS_UPDATE_TOKEN`
   - Value: Paste the PAT you created
   - Click "Add secret"

3. **Verify the workflow runs successfully**:
   - The workflow will use this token to bypass branch protection
   - No pull requests will be created for metrics updates

#### Option 2: Configure Repository Rules (Alternative)

If you prefer not to use a PAT, you can configure repository rules to allow the workflow to bypass:

1. Go to repository Settings → Rules → Rulesets
2. Edit the ruleset protecting the main branch
3. Under "Bypass list", add one of the following:
   - The repository (to allow all workflows)
   - Specific workflows: `.github/workflows/github-metrics.yml`
4. Save the ruleset

#### Option 3: Use Database Storage (Eliminates Git Commits)

If you have a PostgreSQL database available, you can store metrics there instead of committing to git, which completely avoids the branch protection issue:

1. Set up the following secrets in your repository:
   - `DATABASE_URL` or `DATABASE_URL_UNPOOLED`: Your PostgreSQL connection string

2. The workflow will automatically use database storage when these secrets are configured
3. No git commits will be made, so branch protection is not an issue

### Workflow Behavior

- **Schedule**: Runs daily at 04:15 UTC (configurable via cron schedule)
- **Manual trigger**: Can be triggered manually via workflow_dispatch
- **Updates**: Fetches metrics for all your public repositories
- **Storage**:
  - If database configured: Stores data in PostgreSQL (no git commits)
  - If database not configured: Commits changes to `data/githubMetricsHistory.json`
- **Token**: Uses `METRICS_UPDATE_TOKEN` if available, otherwise falls back to default `GITHUB_TOKEN`

### Troubleshooting

**Error: "push declined due to repository rule violations"**
- Ensure `METRICS_UPDATE_TOKEN` secret is set with a PAT that has admin access
- OR configure repository rules to allow workflow bypass
- OR set up database storage to avoid git commits

**Error: "Custom metrics store load failed"**
- This is a warning that database connection failed
- Workflow will fall back to file storage
- If you want to use database storage, ensure `DATABASE_URL` secret is properly configured

