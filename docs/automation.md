---
title: Automation and CI/CD
description: Workflows, cron jobs, and release automation.
order: 8
useToc: true
---
<div class="doc-callout">
  <div class="doc-callout-title">Automate the boring parts</div>
  <div class="doc-callout-body">
    CI/CD keeps releases, metrics, and syndication predictable. Each workflow is isolated,
    documented, and safe to re-run without damaging the main deployment.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">GitHub Actions</span>
    <span class="doc-badge">Semantic Release</span>
    <span class="doc-badge">Cron</span>
    <span class="doc-badge">Idempotent</span>
  </div>
</div>

## Workflow matrix
<table class="doc-table">
  <thead>
    <tr>
      <th>Workflow</th>
      <th>Trigger</th>
      <th>Output</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>.github/workflows/release.yml</code></td>
      <td>Push to <code>main</code></td>
      <td>Semantic release tag + GitHub release notes.</td>
    </tr>
    <tr>
      <td><code>.github/workflows/github-metrics.yml</code></td>
      <td>Cron (daily) + manual dispatch</td>
      <td>Refreshes GitHub metrics history and commits updates.</td>
    </tr>
    <tr>
      <td><code>.github/workflows/syndicate.yml</code></td>
      <td>Posts/config changes + manual dispatch</td>
      <td>Syndicates posts and opens a PR for state updates.</td>
    </tr>
    <tr>
      <td><code>vercel.json</code></td>
      <td>Vercel cron schedule</td>
      <td>Calls <code>/api/github-metrics-update</code> for redundancy.</td>    
    </tr>
    <tr>
      <td><code>/api/project-details-refresh</code></td>
      <td>GitHub Actions or manual webhook</td>
      <td>Forces a project detail refresh for a specific repo.</td>
    </tr>
  </tbody>
</table>

## Release pipeline
<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">01. Conventional commits</div>
    <div class="doc-step-meta">Commit messages drive semantic-release versioning.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">02. GitHub Actions run</div>
    <div class="doc-step-meta">Node 22 executes <code>npx semantic-release</code> on <code>main</code>.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">03. Release notes</div>
    <div class="doc-step-meta">Tags and release notes are published in GitHub.</div>
  </li>
</ul>

## Metrics refresh pipeline
- <code>scripts/updateGithubMetrics.js</code> powers the refresh logic.
- <code>.github/workflows/github-metrics.yml</code> runs nightly and on demand.
- The workflow uses a metrics store adapter (Postgres in production, SQLite locally).
- Vercel cron calls <code>/api/github-metrics-update</code> as a redundant trigger.
- Project detail refreshes can call <code>/api/project-details-refresh?repo=OWNER/REPO</code>.
- <code>scripts/ensureGithubMetrics.js</code> runs before <code>npm run dev</code> to warm the snapshot when missing.
- <code>scripts/updateNugetPackages.js</code> uses the NuGet search API plus <code>data/projects.ts</code>, <code>data/projects.generated.ts</code>, and the GitHub repo list to map packages to projects, writing <code>data/nuget-packages.json</code>.
- <code>scripts/updateProjectRepos.js</code> syncs all owned GitHub repos into <code>data/projects.generated.ts</code>.
- <code>scripts/ensureBuildData.js</code> runs before <code>npm run build</code> to refresh generated data older than 24 hours.

## Syndication pipeline
- Posts are cross-posted after merges to <code>main</code> or manual dispatch.
- The workflow creates a PR for <code>.syndication-state.json</code> updates.
- Errors do not block deployments (<code>continue-on-error</code> is enabled).
- Full configuration details live in <a href="/docs/syndication">Syndication</a>.

## Local runbook
<table class="doc-table">
  <thead>
    <tr>
      <th>Command</th>
      <th>Use case</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>npm run metrics:update</code></td>
      <td>Refresh GitHub metrics history locally.</td>
    </tr>
    <tr>
      <td><code>npm run syndicate:dry-run</code></td>
      <td>Preview syndication without publishing.</td>
    </tr>
    <tr>
      <td><code>npm run syndicate -- --post=slug</code></td>
      <td>Publish a single post.</td>
    </tr>
    <tr>
      <td><code>npm run nuget:update</code></td>
      <td>Regenerate NuGet package mappings from the NuGet profile.</td>
    </tr>
    <tr>
      <td><code>npm run projects:update</code></td>
      <td>Sync owned GitHub repos into <code>data/projects.generated.ts</code>.</td>
    </tr>
  </tbody>
</table>

## Optional environment
<table class="doc-table">
  <thead>
    <tr>
      <th>Variable</th>
      <th>Use case</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>NUGET_PROFILE</code></td>
      <td>Overrides the NuGet profile name used by the NuGet mapping script (defaults to <code>JerrettDavis</code>).</td>
    </tr>
    <tr>
      <td><code>NUGET_PROFILE_URL</code></td>
      <td>Full profile URL to scrape (useful if the profile slug differs).</td>
    </tr>
  </tbody>
</table>

## Required secrets
<div class="doc-diagram">
  <div class="doc-diagram-node">GITHUB_TOKEN</div>
  <div class="doc-diagram-node">HASHNODE_API_TOKEN</div>
  <div class="doc-diagram-node">DEVTO_API_KEY</div>
  <div class="doc-diagram-node">DATABASE_URL</div>
  <div class="doc-diagram-node">METRICS_UPDATE_SECRET</div>
  <div class="doc-diagram-node">PROJECT_DETAIL_REFRESH_SECRET</div>
</div>

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/docs/deployment">
    <span class="doc-card-kicker">Ops</span>
    <span class="doc-card-title">Deployment</span>
    <p class="doc-card-text">Hosting setup and environment configuration.</p>
  </a>
  <a class="doc-card" href="/docs/telemetry">
    <span class="doc-card-kicker">Signals</span>
    <span class="doc-card-title">Telemetry + APIs</span>
    <p class="doc-card-text">Endpoints that workflows refresh.</p>
  </a>
  <a class="doc-card" href="/docs/syndication">
    <span class="doc-card-kicker">Content</span>
    <span class="doc-card-title">Syndication</span>
    <p class="doc-card-text">Detailed publishing pipeline for posts.</p>
  </a>
  <a class="doc-card" href="/docs/testing">
    <span class="doc-card-kicker">Quality</span>
    <span class="doc-card-title">Testing</span>
    <p class="doc-card-text">Automated checks that guard releases.</p>
  </a>
</div>
