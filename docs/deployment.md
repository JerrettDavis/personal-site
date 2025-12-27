---
title: Deployment
description: Build, hosting, and environment configuration.
order: 5
---
<div class="doc-callout">
  <div class="doc-callout-title">From commit to preview</div>
  <div class="doc-callout-body">
    Deployments are designed for Vercel with telemetry surfaces that stay cached and rate-limit
    safe. Previews stay visible in the work-in-progress page to keep the site alive.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Vercel</span>
    <span class="doc-badge">Previews</span>
    <span class="doc-badge">Telemetry</span>
    <span class="doc-badge">Caching</span>
  </div>
</div>

## Build steps
<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">01. Build</div>
    <div class="doc-step-meta"><code>npm run build</code> compiles Next.js and static assets.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">02. Preview</div>
    <div class="doc-step-meta">Vercel generates preview deployments per branch or PR.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">03. Telemetry</div>
    <div class="doc-step-meta">APIs surface build status and repo activity with caching.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">04. Ship</div>
    <div class="doc-step-meta">Production deploys update the live site and RSS feeds.</div>
  </li>
</ul>

<div class="doc-diagram">
  <div class="doc-diagram-node">GitHub commit</div>
  <div class="doc-diagram-node">Vercel build</div>
  <div class="doc-diagram-node">Preview URLs</div>
  <div class="doc-diagram-node">Production deploy</div>
</div>

## Hosting
- The site is designed for Vercel hosting and static delivery.
- The build output includes static assets in <code>public/</code> and pre-rendered routes.

## Environment configuration
- <code>NEXT_PUBLIC_SITE_URL</code> controls canonical URLs in the sitemap.
- RSS feed generation uses the deployment environment to choose the base URL.
- <code>GITHUB_TOKEN</code> (optional) boosts GitHub API limits for pipeline and project-detail telemetry.

## Build telemetry (Vercel previews)
- The live build telemetry reads Vercel deployments via the API route at <code>/api/site-build-status</code>.
- Required env vars:
  - <code>VERCEL_TOKEN</code> (create from Vercel Account Settings -> Tokens).
  - <code>VERCEL_PROJECT_ID</code> (Project Settings -> General -> Project ID).
  - <code>VERCEL_TEAM_ID</code> (optional, only if the project is under a team).
- Local setup: create <code>.env.local</code> with the values above, then run <code>npm run dev</code>.
- CI setup: add the same keys as GitHub Actions secrets and pass them through to the Next.js build/deploy job.
- If tokens are missing, the UI will show telemetry as unavailable instead of hard failing.

## GitHub telemetry (pipelines + project details)
- Pipeline status is served from <code>/api/pipeline-status</code> and project detail snapshots from <code>/api/project-details</code>.
- <code>GITHUB_TOKEN</code> is optional but recommended to avoid anonymous rate limits.
- Project detail requests are cached per repo and throttled on refresh to stay under rate limits.
- If the GitHub API is rate limited, the UI will show a cooldown notice and reuse stale cached data.

## GitHub metrics history
- Historical metrics are stored in <code>data/githubMetricsHistory.json</code> and served by <code>/api/github-metrics</code>.
- Run <code>npm run metrics:update</code> locally or via a scheduled workflow to refresh snapshots.
- Use <code>GITHUB_TOKEN</code> with access to owned repos.
- The optional workflow lives at <code>.github/workflows/github-metrics.yml</code> and runs daily.
- LOC trends are derived from GitHub contributor stats (weekly additions + deletions).
- The metrics store defaults to the JSON file above; set <code>METRICS_STORE=custom</code> and provide <code>METRICS_STORE_ADAPTER</code> (path to a JS module exporting <code>createMetricsStore</code> or <code>metricsStore</code> with <code>getHistory</code>, <code>saveHistory</code>, <code>getLock</code>, <code>setLock</code>, and <code>clearLock</code>) to plug in a database-backed store.
- Only public repos are stored and served. Run <code>npm run metrics:update</code> once after changing tokens to purge any legacy private entries.

<details class="doc-accordion">
  <summary>Local Postgres adapter</summary>
  <ul>
    <li>Set <code>METRICS_STORE=custom</code>.</li>
    <li>Set <code>METRICS_STORE_ADAPTER=scripts/metricsStoreAdapters/postgres.js</code>.</li>
    <li>Set <code>METRICS_PG_URL=postgres://...</code> (or <code>POSTGRES_URL</code> / <code>DATABASE_URL</code> / <code>DATABASE_URL_UNPOOLED</code>).</li>
    <li>Optional: <code>METRICS_PG_SCHEMA</code>, <code>METRICS_PG_HISTORY_TABLE</code>, <code>METRICS_PG_LOCK_TABLE</code>, <code>METRICS_PG_KEY</code>.</li>
  </ul>
</details>

<details class="doc-accordion">
  <summary>Vercel Postgres (free tier)</summary>
  <ul>
    <li>Create a Vercel Postgres database (Hobby tier is free).</li>
    <li>Set <code>METRICS_STORE=custom</code> and <code>METRICS_STORE_ADAPTER=scripts/metricsStoreAdapters/postgres.js</code>.</li>
    <li>Vercel provides <code>POSTGRES_URL</code> automatically, no extra config needed.</li>
  </ul>
</details>
<details class="doc-accordion">
  <summary>Neon Postgres (free tier)</summary>
  <ul>
    <li>Use the provided <code>DATABASE_URL</code> or <code>DATABASE_URL_UNPOOLED</code> from Neon.</li>
    <li>Optionally supply <code>PGHOST</code>, <code>PGUSER</code>, <code>PGPASSWORD</code>, <code>PGDATABASE</code> to connect without a URL.</li>
    <li>Set <code>METRICS_STORE=custom</code> and <code>METRICS_STORE_ADAPTER=scripts/metricsStoreAdapters/postgres.js</code>.</li>
  </ul>
</details>

<details class="doc-accordion">
  <summary>Local SQLite adapter</summary>
  <ul>
    <li>Set <code>METRICS_STORE=custom</code>.</li>
    <li>Set <code>METRICS_STORE_ADAPTER=scripts/metricsStoreAdapters/sqlite.js</code>.</li>
    <li>Optional: <code>METRICS_SQLITE_PATH</code> (defaults to <code>data/githubMetrics.sqlite</code>).</li>
    <li>Optional: <code>METRICS_SQLITE_HISTORY_TABLE</code>, <code>METRICS_SQLITE_LOCK_TABLE</code>, <code>METRICS_SQLITE_KEY</code>.</li>
  </ul>
</details>
<div class="doc-callout">
  <div class="doc-callout-title">Local default</div>
  <div class="doc-callout-body">
    When running locally without <code>METRICS_STORE</code> or <code>METRICS_STORE_ADAPTER</code>,
    the metrics store defaults to the SQLite adapter in <code>scripts/metricsStoreAdapters/sqlite.js</code>.
    Set <code>METRICS_STORE=file</code> to force JSON storage.
  </div>
</div>
<div class="doc-callout">
  <div class="doc-callout-title">Production default</div>
  <div class="doc-callout-body">
    In production, if <code>POSTGRES_URL</code> (or other Postgres connection envs) is present and no
    metrics override is set, the metrics store automatically uses the Postgres adapter.
  </div>
</div>

<details class="doc-accordion">
  <summary>Local checklist</summary>
  <ul>
    <li>Copy <code>.env.local</code> values into the local environment.</li>
    <li>Run <code>npm run dev</code> and verify telemetry cards load.</li>
    <li>Open <code>/work-in-progress</code> to confirm preview data.</li>
  </ul>
</details>

<table class="doc-table">
  <thead>
    <tr>
      <th>Variable</th>
      <th>Purpose</th>
      <th>Used by</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>VERCEL_TOKEN</td>
      <td>Vercel API access</td>
      <td>Site build status</td>
    </tr>
    <tr>
      <td>VERCEL_PROJECT_ID</td>
      <td>Project lookup</td>
      <td>Preview deployments</td>
    </tr>
    <tr>
      <td>VERCEL_TEAM_ID</td>
      <td>Team scoping</td>
      <td>Optional for team projects</td>
    </tr>
    <tr>
      <td>GITHUB_TOKEN</td>
      <td>GitHub API access</td>
      <td>Pipelines + project details</td>
    </tr>
    <tr>
      <td>METRICS_STORE</td>
      <td>Metrics storage mode (<code>file</code> or <code>custom</code>)</td>
      <td>GitHub metrics history</td>
    </tr>
    <tr>
      <td>METRICS_STORE_ADAPTER</td>
      <td>Path to a custom metrics store module</td>
      <td>GitHub metrics history</td>
    </tr>
    <tr>
      <td>METRICS_PG_URL</td>
      <td>Postgres connection string for the adapter</td>
      <td>GitHub metrics history</td>
    </tr>
    <tr>
      <td>POSTGRES_URL</td>
      <td>Vercel Postgres connection string</td>
      <td>GitHub metrics history</td>
    </tr>
    <tr>
      <td>DATABASE_URL_UNPOOLED</td>
      <td>Neon Postgres unpooled connection string</td>
      <td>GitHub metrics history</td>
    </tr>
    <tr>
      <td>METRICS_SQLITE_PATH</td>
      <td>SQLite file path for local metrics storage</td>
      <td>GitHub metrics history</td>
    </tr>
  </tbody>
</table>

## Testing configuration
- <code>MOCK_GITHUB_DATA_PATH</code> points to a JSON fixture used in tests to avoid live GitHub API calls.
- <code>PLAYWRIGHT_BASE_URL</code> skips spinning up <code>npm run dev</code> and targets an existing server.

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/work-in-progress">
    <span class="doc-card-kicker">Previews</span>
    <span class="doc-card-title">Work in progress</span>
    <p class="doc-card-text">Active preview deployments and PR status.</p>
  </a>
  <a class="doc-card" href="/pipelines">
    <span class="doc-card-kicker">Telemetry</span>
    <span class="doc-card-title">Pipeline status</span>
    <p class="doc-card-text">Live build and repo activity surfaces.</p>
  </a>
  <a class="doc-card" href="/docs/testing">
    <span class="doc-card-kicker">Quality</span>
    <span class="doc-card-title">Testing</span>
    <p class="doc-card-text">How we keep deployments safe and predictable.</p>
  </a>
  <a class="doc-card" href="/docs/content-pipeline">
    <span class="doc-card-kicker">Content</span>
    <span class="doc-card-title">Pipeline flow</span>
    <p class="doc-card-text">Where content is generated before deployment.</p>
  </a>
</div>
