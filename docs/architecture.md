---
title: Architecture
description: How pages, components, and content sources fit together.
order: 2
---
<div class="doc-callout">
  <div class="doc-callout-title">System overview</div>
  <div class="doc-callout-body">
    The site is a layered system: routing and layout at the top, content and data in the middle,
    and telemetry APIs at the edge. This page shows how those layers stay aligned.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Pages router</span>
    <span class="doc-badge">Static shells</span>
    <span class="doc-badge">Shared hooks</span>
    <span class="doc-badge">Telemetry edges</span>
  </div>
</div>

## Routing map
<table class="doc-table">
  <thead>
    <tr>
      <th>Route family</th>
      <th>Source</th>
      <th>Purpose</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>/</td>
      <td>pages/index.tsx</td>
      <td>Live overview, hero, and status surfaces.</td>
    </tr>
    <tr>
      <td>/projects</td>
      <td>pages/projects.tsx</td>
      <td>Project cards with expandable detail panels.</td>
    </tr>
    <tr>
      <td>/pipelines</td>
      <td>pages/pipelines.tsx</td>
      <td>Repo activity and pipeline telemetry.</td>
    </tr>
    <tr>
      <td>/docs</td>
      <td>docs/*.md</td>
      <td>Markdown-driven documentation.</td>
    </tr>
  </tbody>
</table>

## Page structure
<div class="doc-split">
  <div>
    <h3>Core layout</h3>
    <ul>
      <li><code>components/layout.tsx</code> provides the global header, navigation, and page shell.</li>
      <li>Theme switching is handled by a dedicated toggle component.</li>
      <li>Reveal, grid tracking, and glow hotspots are shared hooks in <code>lib/hooks</code>.</li>
    </ul>
  </div>
  <div>
    <h3>Telemetry and data</h3>
    <ul>
      <li>Telemetry APIs live under <code>pages/api</code> for build and repo status.</li>
      <li><code>lib/cacheStore.ts</code> centralizes caching, inflight dedupe, and rate limits.</li>
      <li>Project detail panels fetch on demand and hydrate into expanded cards.</li>
      <li><code>data/githubMetricsHistory.json</code> stores historical commit and LOC snapshots.</li>
    </ul>
  </div>
</div>

## Request journey
<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">01. Route match</div>
    <div class="doc-step-meta">Next.js serves the correct page and shared layout shell.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">02. Content hydrate</div>
    <div class="doc-step-meta">Static data and markdown output render into the page.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">03. Telemetry sync</div>
    <div class="doc-step-meta">Client hooks request cached API data and update surfaces.</div>
  </li>
</ul>

<div class="doc-diagram">
  <div class="doc-diagram-node">Pages + Layout</div>
  <div class="doc-diagram-node">Data + Markdown</div>
  <div class="doc-diagram-node">Hooks + UI</div>
  <div class="doc-diagram-node">Telemetry APIs</div>
  <div class="doc-diagram-node">External APIs</div>
</div>

## Content inputs
- <code>posts/</code> stores markdown-based blog posts.
- <code>docs/</code> stores markdown documentation that is published to the site.
- <code>data/</code> holds structured content for projects, tools, navigation, and hobbies.

## Consistency conventions
- Prefer declarative, data-driven rendering from <code>data/</code> and <code>lib/</code> helpers.
- Keep side effects in shared hooks instead of in-page ad hoc effects.
- Normalize cross-cutting logic (tag matching, key handling, scroll lock) into utilities.
- Treat markdown pipelines and search index builders as pure functions with explicit inputs.

## Build output
- <code>public/</code> serves static assets, RSS feeds, and the generated sitemap endpoint.
- Next.js handles static generation for content pages and server-side rendering only where needed.

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/projects">
    <span class="doc-card-kicker">Projects</span>
    <span class="doc-card-title">Interactive cards</span>
    <p class="doc-card-text">See how data-driven rendering looks in practice.</p>
  </a>
  <a class="doc-card" href="/pipelines">
    <span class="doc-card-kicker">Telemetry</span>
    <span class="doc-card-title">Pipeline status</span>
    <p class="doc-card-text">Live signals from GitHub and Vercel.</p>
  </a>
  <a class="doc-card" href="/docs/tech-stack">
    <span class="doc-card-kicker">Stack</span>
    <span class="doc-card-title">Core technologies</span>
    <p class="doc-card-text">Frameworks and services that shape the architecture.</p>
  </a>
  <a class="doc-card" href="/docs/content-pipeline">
    <span class="doc-card-kicker">Content</span>
    <span class="doc-card-title">Pipeline flow</span>
    <p class="doc-card-text">Follow how markdown becomes pages.</p>
  </a>
</div>
