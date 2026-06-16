# GitHub Workflows

## GitHub Metrics Workflow

The `github-metrics.yml` workflow automatically updates GitHub metrics on a daily schedule.

### Problem

The workflow fails with the error "Changes must be made through a pull request" because the repository has branch protection rules that prevent direct commits to the main branch.

### Solutions

There are two ways to fix this issue:

#### Option 1: Configure Repository Rules

If you prefer not to use a PAT, you can configure repository rules to allow the workflow to bypass:

1. Go to repository Settings → Rules → Rulesets
2. Edit the ruleset protecting the main branch
3. Under "Bypass list", add one of the following:
   - The repository (to allow all workflows)
   - Specific workflows: `.github/workflows/github-metrics.yml`
4. Save the ruleset

#### Option 2: Use Runtime Database Storage

If you have a PostgreSQL database available in the deployed host, the live API can store refreshed metrics there instead of relying only on the committed JSON snapshot:

1. Set up one of the following deployment environment variables with your PostgreSQL connection string:
   - `DATABASE_URL` or `DATABASE_URL_UNPOOLED` (recommended for Vercel/Neon)
   - `POSTGRES_URL` or `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_PRISMA_URL`
   - `METRICS_PG_URL`
   - `PG_CONNECTION_STRING`
   - Or configure individual connection parameters: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

2. The deployed metrics endpoints will use database storage when any of these variables are configured
3. The scheduled workflow still refreshes the committed JSON snapshot with `GITHUB_TOKEN` so builds have a fallback

### Workflow Behavior

- **Schedule**: Runs daily at 04:15 UTC (configurable via cron schedule)
- **Manual trigger**: Can be triggered manually via workflow_dispatch
- **Updates**: Fetches metrics for all your public repositories
- **Storage**: Commits changes to `data/githubMetricsHistory.json`; branch-rule push failures are downgraded to warnings
- **Token**: Uses the built-in `GITHUB_TOKEN`

### Troubleshooting

**Error: "push declined due to repository rule violations"**
- Configure repository rules to allow workflow bypass
- The current workflow treats this as a warning so a successful metrics refresh does not fail only because the generated file commit is blocked

**Error: "Custom metrics store load failed"**
- This is a warning that database connection failed
- Workflow will fall back to file storage
- If you want to use database storage, ensure one of the supported PostgreSQL environment variable secrets is properly configured: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `METRICS_PG_URL`, `PG_CONNECTION_STRING`, or individual connection parameters (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`)
