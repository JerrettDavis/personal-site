# GitHub Workflows

## GitHub Metrics Workflow

The `github-metrics.yml` workflow automatically updates GitHub metrics on a daily schedule.

### Setup Requirements

To bypass branch protection rules and allow automated commits without pull requests, you need to create a Personal Access Token (PAT) with appropriate permissions:

1. **Create a Personal Access Token (PAT)**:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Click "Generate new token"
   - Give it a descriptive name like "Metrics Update Token"
   - Set repository access to "Only select repositories" and choose this repository
   - Grant the following permissions:
     - **Contents**: Read and write
     - **Workflows**: Read and write (if needed to update workflow files)
   - Generate the token and copy it

2. **Add the token as a repository secret**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `METRICS_UPDATE_TOKEN`
   - Value: Paste the PAT you created
   - Click "Add secret"

3. **Configure branch protection bypass** (if using fine-grained token):
   - The token owner needs to have admin access to the repository
   - OR add the GitHub Actions app to the branch protection bypass list

### Alternative: Database Storage

If you have a PostgreSQL database available, you can store metrics there instead of committing to git:

1. Set up the following secrets:
   - `DATABASE_URL` or `DATABASE_URL_UNPOOLED`: Your PostgreSQL connection string

2. The workflow will automatically use database storage when these secrets are configured, eliminating the need for git commits.

### Workflow Behavior

- Runs daily at 04:15 UTC (configurable via cron schedule)
- Updates GitHub metrics for all your public repositories
- If using file storage: Commits changes to `data/githubMetricsHistory.json`
- If using database storage: Stores data in PostgreSQL (no git commits)
- Requires `METRICS_UPDATE_TOKEN` secret to bypass branch protection when using file storage
