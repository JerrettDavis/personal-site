---
title: Deployment
description: Build, hosting, and environment configuration.
order: 7
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
- <code>VERCEL_TOKEN</code> + <code>VERCEL_PROJECT_ID</code> are required for build telemetry.
- <code>VERCEL_TEAM_ID</code> is optional for team-scoped projects.
- <code>GITHUB_TOKEN</code> boosts GitHub API limits for pipeline + project telemetry.

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
      <td>NEXT_PUBLIC_SITE_URL</td>
      <td>Canonical base URL</td>
      <td>Sitemap + RSS generation</td>
    </tr>
    <tr>
      <td>VERCEL_TOKEN</td>
      <td>Vercel API access</td>
      <td>Build + preview telemetry</td>
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
  </tbody>
</table>

## Telemetry surfaces
- <code>/api/site-build-status</code> surfaces Vercel deployment states.
- <code>/api/pipeline-status</code> and <code>/api/project-details</code> read GitHub workflow and repo signals.
- <code>/api/github-metrics</code> exposes historical activity snapshots.
- See <a href="/docs/telemetry">Telemetry and APIs</a> for cache rules, refresh controls, and metrics storage.

## Automation ties
- GitHub Actions handles releases, metrics refreshes, and syndication.
- Vercel cron provides a redundant metrics refresh trigger.
- See <a href="/docs/automation">Automation and CI/CD</a> for workflow details.

<details class="doc-accordion">
  <summary>Local checklist</summary>
  <ul>
    <li>Copy <code>.env.local</code> values into the local environment.</li>
    <li>Run <code>npm run dev</code> and verify telemetry cards load.</li>
    <li>Open <code>/work-in-progress</code> to confirm preview data.</li>
  </ul>
</details>

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/work-in-progress">
    <span class="doc-card-kicker">Previews</span>
    <span class="doc-card-title">Work in progress</span>
    <p class="doc-card-text">Active preview deployments and PR status.</p>
  </a>
  <a class="doc-card" href="/docs/telemetry">
    <span class="doc-card-kicker">Telemetry</span>
    <span class="doc-card-title">Telemetry + APIs</span>
    <p class="doc-card-text">Caching, rate limits, and refresh behavior.</p>
  </a>
  <a class="doc-card" href="/docs/automation">
    <span class="doc-card-kicker">CI/CD</span>
    <span class="doc-card-title">Automation</span>
    <p class="doc-card-text">Workflows and cron jobs tied to deployment.</p>
  </a>
  <a class="doc-card" href="/docs/testing">
    <span class="doc-card-kicker">Quality</span>
    <span class="doc-card-title">Testing</span>
    <p class="doc-card-text">Release checks and test coverage expectations.</p>
  </a>
</div>
