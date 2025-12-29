---
title: Telemetry and APIs
description: Live data surfaces, API contracts, and caching strategy.
order: 6
useToc: true
---
<div class="doc-callout">
  <div class="doc-callout-title">Always on, never noisy</div>
  <div class="doc-callout-body">
    Telemetry routes keep the site feeling alive without hammering external APIs. Each endpoint
    is cached, rate-limit aware, and designed for safe manual refreshes.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">GitHub</span>
    <span class="doc-badge">Vercel</span>
    <span class="doc-badge">Cache aware</span>
    <span class="doc-badge">Rate limited</span>
  </div>
</div>

## API surface map
<table class="doc-table">
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>Purpose</th>
      <th>Refresh</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>/api/site-build-status</code></td>
      <td>Vercel production + preview deployment status.</td>
      <td><code>?refresh=1</code> (cooldown enforced)</td>
    </tr>
    <tr>
      <td><code>/api/pipeline-status</code></td>
      <td>GitHub Actions run summaries for active repos.</td>
      <td><code>?refresh=1</code> (cooldown enforced)</td>
    </tr>
    <tr>
      <td><code>/api/project-details</code></td>
      <td>README snapshots, issues, pulls, latest release, optional NuGet stats.</td>
      <td><code>?repo=OWNER/REPO</code> + optional <code>refresh=1</code></td>  
    </tr>
    <tr>
      <td><code>/api/project-details-refresh</code></td>
      <td>Webhook-friendly refresh trigger for a single repo.</td>
      <td><code>?repo=OWNER/REPO</code> (supports bearer token)</td>
    </tr>
    <tr>
      <td><code>/api/github-metrics</code></td>
      <td>Historic commit, LOC, star, fork trends.</td>
      <td><code>?refresh=1</code> (uses metrics store)</td>
    </tr>
    <tr>
      <td><code>/api/github-metrics-update</code></td>
      <td>Kick off a background metrics refresh.</td>
      <td>GET/POST; optional <code>token</code> or bearer auth</td>
    </tr>
    <tr>
      <td><code>/api/nuget-metrics</code></td>
      <td>Aggregated NuGet downloads for configured packages.</td>
      <td><code>?refresh=1</code> (cooldown enforced)</td>
    </tr>
    <tr>
      <td><code>/api/github-metrics-repo</code></td>
      <td>Refresh a single repo metrics entry.</td>
      <td><code>?repo=OWNER/REPO</code> (cooldown enforced)</td>
    </tr>
    <tr>
      <td><code>/api/search-index</code></td>
      <td>Unified search payload for posts + nav.</td>
      <td>Cached for 5 minutes</td>
    </tr>
  </tbody>
</table>

## Caching layers
<div class="doc-split">
  <div>
    <h3>Server cache</h3>
    <ul>
      <li><code>lib/cacheStore.ts</code> centralizes in-memory cache entries.</li>
      <li><code>/api/project-details</code> can persist snapshots in Postgres for cross-instance reuse.</li>
      <li>Requests dedupe with an in-flight promise to prevent double-fetching.</li>
      <li>Manual refreshes use cooldown checks to avoid spikes.</li>
    </ul>
  </div>
  <div>
    <h3>Client cache</h3>
    <ul>
      <li><code>lib/telemetryStore.ts</code> stores payloads in <code>localStorage</code>.</li>
      <li>Cached payloads render instantly, then refresh in the background.</li>
      <li>Refresh cadence adapts based on live state (e.g., active builds).</li>
    </ul>
  </div>
</div>

## Rate limits + fallbacks
- GitHub and Vercel responses are inspected for rate-limit headers.
- When rate limited, the APIs return cached data plus a <code>rateLimitedUntil</code> timestamp.
- Clients display cooldown messaging and keep existing data visible.
- Server responses include <code>Retry-After</code> headers when appropriate.

## Default TTLs
<table class="doc-table">
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>Fresh TTL</th>
      <th>Stale window</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>/api/project-details</code></td>
      <td>Global TTL</td>
      <td>Global stale window</td>
    </tr>
    <tr>
      <td><code>/api/pipeline-status</code></td>
      <td>Global TTL (active uses <code>PIPELINE_ACTIVE_CACHE_TTL_MS</code>)</td>
      <td>Global stale window</td>
    </tr>
    <tr>
      <td><code>/api/site-build-status</code></td>
      <td>Global TTL (active uses <code>SITE_BUILD_ACTIVE_CACHE_TTL_MS</code>)</td>
      <td>Global stale window</td>
    </tr>
    <tr>
      <td><code>/api/github-metrics</code></td>
      <td>Global TTL</td>
      <td>Global stale window</td>
    </tr>
    <tr>
      <td><code>/api/nuget-metrics</code></td>
      <td>Global TTL (override recommended)</td>
      <td>Global stale window</td>
    </tr>
    <tr>
      <td><code>/api/search-index</code></td>
      <td>5 minutes</td>
      <td>15 minutes</td>
    </tr>
  </tbody>
</table>
<p class="doc-note">Tip: set <code>NUGET_CACHE_TTL_MS</code> and <code>NUGET_CACHE_STALE_MS</code> to keep NuGet refreshes less frequent (e.g., 6h/24h).</p>

## Global cache defaults
<p>All external-API endpoints share a global cache baseline, with per-endpoint overrides when needed.</p>
<table class="doc-table">
  <thead>
    <tr>
      <th>Variable</th>
      <th>Purpose</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>GLOBAL_CACHE_TTL_MS</td>
      <td>Default fresh TTL</td>
      <td>Applies to API caches unless an endpoint override is set (default 5 minutes).</td>
    </tr>
    <tr>
      <td>GLOBAL_CACHE_STALE_MS</td>
      <td>Default stale window</td>
      <td>Controls how long stale responses are served (default 60 minutes).</td>
    </tr>
  </tbody>
</table>

<details class="doc-accordion">
  <summary>Endpoint override keys</summary>
  <ul>
    <li><code>PROJECT_DETAIL_CACHE_TTL_MS</code> / <code>PROJECT_DETAIL_CACHE_STALE_MS</code></li>
    <li><code>PIPELINE_CACHE_TTL_MS</code> / <code>PIPELINE_CACHE_STALE_MS</code></li>
    <li><code>PIPELINE_ACTIVE_CACHE_TTL_MS</code></li>
    <li><code>SITE_BUILD_CACHE_TTL_MS</code> / <code>SITE_BUILD_CACHE_STALE_MS</code></li>
    <li><code>SITE_BUILD_ACTIVE_CACHE_TTL_MS</code></li>
    <li><code>GITHUB_METRICS_CACHE_TTL_MS</code> / <code>GITHUB_METRICS_CACHE_STALE_MS</code></li>
    <li><code>NUGET_CACHE_TTL_MS</code> / <code>NUGET_CACHE_STALE_MS</code></li>
  </ul>
</details>

## Metrics store + persistence
GitHub metrics history is stored centrally so charts survive redeploys.

<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">01. File store</div>
    <div class="doc-step-meta"><code>data/githubMetricsHistory.json</code> is the default local store.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">02. SQLite (local)</div>
    <div class="doc-step-meta">Default local adapter when no overrides are set.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">03. Postgres (prod)</div>
    <div class="doc-step-meta">Automatically selected in production when a Postgres URL is available.</div>
  </li>
</ul>

<details class="doc-accordion">
  <summary>Adapter rules</summary>
  <ul>
    <li><code>METRICS_STORE=custom</code> forces adapter usage.</li>
    <li><code>METRICS_STORE=file</code> forces JSON file storage.</li>
    <li>Adapters live in <code>scripts/metricsStoreAdapters/</code> (SQLite + Postgres).</li>
    <li><code>METRICS_STORE_ADAPTER</code> can point to any JS module that exports a <code>createMetricsStore</code> factory or <code>metricsStore</code> object.</li>
  </ul>
</details>

## Project detail cache
Project detail snapshots can be stored in Postgres to reduce GitHub API traffic in
production or high-load scenarios. When enabled, the API checks Postgres before
hitting GitHub and writes fresh snapshots back into the cache table.

<table class="doc-table">
  <thead>
    <tr>
      <th>Variable</th>
      <th>Purpose</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>PROJECT_DETAIL_CACHE</td>
      <td>Cache mode</td>
      <td><code>auto</code> (default), <code>postgres</code>, or <code>disabled</code>.</td>
    </tr>
    <tr>
      <td>PROJECT_DETAIL_CACHE_PG_URL</td>
      <td>Postgres connection string</td>
      <td>Falls back to <code>DATABASE_URL</code> and other Postgres env vars.</td>
    </tr>
    <tr>
      <td>PROJECT_DETAIL_CACHE_SCHEMA</td>
      <td>Schema name</td>
      <td>Defaults to <code>public</code>.</td>
    </tr>
    <tr>
      <td>PROJECT_DETAIL_CACHE_TABLE</td>
      <td>Table name</td>
      <td>Defaults to <code>project_detail_cache</code>.</td>
    </tr>
    <tr>
      <td>PROJECT_DETAIL_CACHE_TTL_MS</td>
      <td>Cache TTL</td>
      <td>Override default 10 minutes for project detail snapshots.</td>
    </tr>
    <tr>
      <td>PROJECT_DETAIL_CACHE_STALE_MS</td>
      <td>Stale window</td>
      <td>Override default 60 minutes for stale serving.</td>
    </tr>
    <tr>
      <td>PROJECT_DETAIL_REFRESH_SECRET</td>
      <td>Webhook auth</td>
      <td>Bearer token required by <code>/api/project-details-refresh</code>.</td>
    </tr>
  </tbody>
</table>

## Metrics configuration
Use these variables to control where metrics are stored and how refreshes are throttled.

<table class="doc-table">
  <thead>
    <tr>
      <th>Variable</th>
      <th>Purpose</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>METRICS_STORE</td>
      <td>Storage mode</td>
      <td><code>file</code> forces JSON, <code>custom</code> forces adapter.</td>
    </tr>
    <tr>
      <td>METRICS_STORE_ADAPTER</td>
      <td>Adapter module path</td>
      <td>JS module exporting <code>createMetricsStore</code> or <code>metricsStore</code>.</td>
    </tr>
    <tr>
      <td>METRICS_PG_URL</td>
      <td>Postgres connection string</td>
      <td>Any Postgres URL also works (e.g. <code>POSTGRES_URL</code>).</td>
    </tr>
    <tr>
      <td>DATABASE_URL</td>
      <td>Neon or Postgres URL</td>
      <td>Supports pooled or unpooled variants.</td>
    </tr>
    <tr>
      <td>METRICS_SQLITE_PATH</td>
      <td>SQLite file path</td>
      <td>Defaults to <code>data/githubMetrics.sqlite</code>.</td>
    </tr>
    <tr>
      <td>METRICS_UPDATE_SECRET</td>
      <td>Protect update endpoint</td>
      <td>Bearer token for <code>/api/github-metrics-update</code>.</td>
    </tr>
    <tr>
      <td>METRICS_UPDATE_MIN_INTERVAL_MS</td>
      <td>Refresh throttle</td>
      <td>Minimum delay between full metrics updates.</td>
    </tr>
  </tbody>
</table>

<p>Token requirements for GitHub + Vercel telemetry are covered in <a href="/docs/deployment">Deployment</a>.</p>

## Manual refresh rules
- <code>?refresh=1</code> triggers manual refresh for telemetry endpoints.
- <code>/api/github-metrics-update</code> enforces minimum intervals (configured via <code>METRICS_UPDATE_MIN_INTERVAL_MS</code>).
- Repo refreshes throttle at 1 minute locally and 5 minutes in production.

## Security notes
- Tokens (GitHub, Vercel) are only read in API routes and never shipped to the client.
- Public responses contain no secrets; only URLs and aggregate metrics.

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/docs/deployment">
    <span class="doc-card-kicker">Ops</span>
    <span class="doc-card-title">Deployment</span>
    <p class="doc-card-text">Environment variables and hosting setup.</p>
  </a>
  <a class="doc-card" href="/docs/automation">
    <span class="doc-card-kicker">CI/CD</span>
    <span class="doc-card-title">Automation</span>
    <p class="doc-card-text">Workflows that keep telemetry updated.</p>
  </a>
  <a class="doc-card" href="/projects#pipeline-metrics">
    <span class="doc-card-kicker">Live</span>
    <span class="doc-card-title">Pipeline metrics</span>
    <p class="doc-card-text">See the telemetry surfaces in action.</p>
  </a>
  <a class="doc-card" href="/docs/testing">
    <span class="doc-card-kicker">Quality</span>
    <span class="doc-card-title">Testing</span>
    <p class="doc-card-text">How telemetry is validated in tests.</p>
  </a>
</div>
