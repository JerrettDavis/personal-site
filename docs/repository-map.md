---
title: Repository map
description: Where everything lives and how to extend it without guesswork.
order: 3
---
<div class="doc-callout">
  <div class="doc-callout-title">Know the terrain</div>
  <div class="doc-callout-body">
    The repo is split into content, UI, data, and automation. This map shows what each folder
    owns and where new work should land so changes stay predictable.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Content</span>
    <span class="doc-badge">UI</span>
    <span class="doc-badge">Data</span>
    <span class="doc-badge">Automation</span>
  </div>
</div>

## Top-level layout
<table class="doc-table">
  <thead>
    <tr>
      <th>Path</th>
      <th>Purpose</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>pages/</code></td>
      <td>Routes and API handlers</td>
      <td>Next.js pages router + serverless API routes.</td>
    </tr>
    <tr>
      <td><code>components/</code></td>
      <td>Reusable UI surfaces</td>
      <td>Cards, headers, telemetry views, layout shells.</td>
    </tr>
    <tr>
      <td><code>lib/</code></td>
      <td>Core logic + helpers</td>
      <td>Markdown pipeline, caching, telemetry stores.</td>
    </tr>
    <tr>
      <td><code>data/</code></td>
      <td>Typed content lists</td>
      <td>Navigation, tools, projects, hobbies.</td>
    </tr>
    <tr>
      <td><code>docs/</code></td>
      <td>Documentation source</td>
      <td>Rendered at <code>/docs</code>.</td>
    </tr>
    <tr>
      <td><code>posts/</code></td>
      <td>Blog content</td>
      <td>Markdown + frontmatter for posts.</td>
    </tr>
    <tr>
      <td><code>scripts/</code></td>
      <td>Automation helpers</td>
      <td>Metrics refresh, syndication, adapters.</td>
    </tr>
    <tr>
      <td><code>schemas/</code></td>
      <td>JSON schemas</td>
      <td>Validation for syndication config and state.</td>
    </tr>
    <tr>
      <td><code>styles/</code></td>
      <td>Global styling</td>
      <td>Shared CSS variables and utilities.</td>
    </tr>
    <tr>
      <td><code>utils/</code></td>
      <td>Build helpers</td>
      <td>Feed generation and MDX utilities.</td>
    </tr>
    <tr>
      <td><code>public/</code></td>
      <td>Static assets</td>
      <td>Icons, images, and generated feeds.</td>
    </tr>
    <tr>
      <td><code>tests/</code> + <code>__tests__/</code></td>
      <td>Automated checks</td>
      <td>Playwright E2E + Jest unit/component tests.</td>
    </tr>
  </tbody>
</table>

## Core runtime layers
<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-card-kicker">Rendering</span>
    <span class="doc-card-title">Pages + layout</span>
    <p class="doc-card-text">Routing lives in <code>pages/</code> with shared layout in <code>components/layout.tsx</code>.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">Content</span>
    <span class="doc-card-title">Markdown pipeline</span>
    <p class="doc-card-text">Parsing and rendering lives in <code>lib/markdown*</code> and <code>lib/docs.ts</code>.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">Telemetry</span>
    <span class="doc-card-title">API + cache</span>
    <p class="doc-card-text">Server cache lives in <code>lib/cacheStore.ts</code> and telemetry APIs under <code>pages/api</code>.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">State</span>
    <span class="doc-card-title">Metrics store</span>
    <p class="doc-card-text">Metrics history uses <code>lib/metricsStore.ts</code> with file or DB adapters.</p>
  </div>
</div>

## Configuration + schemas
- <code>package.json</code> holds scripts, dependencies, and automation entry points.
- <code>next.config.js</code> configures build-time behavior and runtime settings.
- <code>vercel.json</code> declares Vercel cron schedules.
- <code>.releaserc.json</code> defines semantic-release rules.
- <code>.syndication.config.json</code> configures publishing filters and platform settings.
- <code>schemas/</code> stores JSON schemas for syndication config/state.

## Generated and stateful files
<details class="doc-accordion">
  <summary>State and generated artifacts</summary>
  <ul>
    <li><code>data/githubMetricsHistory.json</code> stores historical GitHub metrics snapshots.</li>
    <li><code>data/nuget-packages.json</code> stores auto-detected NuGet package mappings.</li>
    <li><code>data/projects.generated.ts</code> stores generated repo entries from GitHub.</li>
    <li><code>.syndication-state.json</code> tracks external publication URLs.</li>
    <li><code>public/rss.xml</code>, <code>public/atom.xml</code>, <code>public/rss.json</code> are generated feeds.</li>
  </ul>
</details>

## Where to add new work
<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">Add a new page</div>
    <div class="doc-step-meta">Create a file in <code>pages/</code> and reuse layout + section hooks.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Add content</div>
    <div class="doc-step-meta">Drop markdown into <code>posts/</code> or <code>docs/</code>.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Add data</div>
    <div class="doc-step-meta">Extend <code>data/</code> lists (including <code>nugetPackages</code> in <code>data/projects.ts</code>) and re-render UI cards.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Add an API</div>
    <div class="doc-step-meta">Create <code>pages/api</code> handlers and cache with <code>lib/cacheStore.ts</code>.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Add automation</div>
    <div class="doc-step-meta">Create a script in <code>scripts/</code> and wire it in GitHub Actions.</div>
  </li>
</ul>

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/docs/architecture">
    <span class="doc-card-kicker">System map</span>
    <span class="doc-card-title">Architecture</span>
    <p class="doc-card-text">See how layers connect at runtime.</p>
  </a>
  <a class="doc-card" href="/docs/content-pipeline">
    <span class="doc-card-kicker">Content</span>
    <span class="doc-card-title">Content pipeline</span>
    <p class="doc-card-text">Follow how markdown becomes pages.</p>
  </a>
  <a class="doc-card" href="/docs/telemetry">
    <span class="doc-card-kicker">Signals</span>
    <span class="doc-card-title">Telemetry + APIs</span>
    <p class="doc-card-text">Endpoints, caching, and refresh logic.</p>
  </a>
  <a class="doc-card" href="/docs/automation">
    <span class="doc-card-kicker">Ops</span>
    <span class="doc-card-title">Automation</span>
    <p class="doc-card-text">CI/CD workflows and scheduled jobs.</p>
  </a>
</div>
