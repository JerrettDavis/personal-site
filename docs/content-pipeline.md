---
title: Content pipeline
description: How markdown becomes pages, feeds, and search data.
order: 3
---
<div class="doc-callout">
  <div class="doc-callout-title">Content in, experiences out</div>
  <div class="doc-callout-body">
    Markdown and structured data move through a predictable pipeline: parse, enrich, render, and
    publish. The flow diagram below mirrors this sequence in motion.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Markdown</span>
    <span class="doc-badge">Frontmatter</span>
    <span class="doc-badge">Feeds</span>
    <span class="doc-badge">Search</span>
  </div>
</div>

## Pipeline steps
<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">01. Ingest</div>
    <div class="doc-step-meta">Load markdown, data files, and navigation metadata.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">02. Parse + enrich</div>
    <div class="doc-step-meta">Frontmatter is normalized and summaries are computed.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">03. Render</div>
    <div class="doc-step-meta">Markdown becomes HTML, with headings and syntax styling.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">04. Publish</div>
    <div class="doc-step-meta">Pages, feeds, and search surfaces are emitted at build time.</div>
  </li>
</ul>

<div class="doc-diagram">
  <div class="doc-diagram-node">posts/</div>
  <div class="doc-diagram-node">docs/</div>
  <div class="doc-diagram-node">data/</div>
  <div class="doc-diagram-node">Markdown render</div>
  <div class="doc-diagram-node">Feeds + sitemap</div>
  <div class="doc-diagram-node">Search index</div>
</div>

## Blog posts
- Blog content lives in <code>posts/</code> as markdown with frontmatter.
- <code>lib/posts.ts</code> loads, parses, and converts markdown into HTML.
- Metadata drives tags, categories, series, and listing pages.
- Reading time is derived from word counts during rendering.

## Documentation
- Documentation lives in <code>docs/</code> as markdown with frontmatter.
- <code>lib/docs.ts</code> loads documentation content and renders it for <code>/docs</code> routes.
- The docs index pulls in <code>docs/index.md</code> as the landing page.

## Feeds and metadata
- <code>utils/generateRSSFeed.ts</code> builds RSS, Atom, and JSON feeds into <code>public/</code>.
- <code>pages/sitemap.xml.tsx</code> composes sitemap entries for posts, tags, categories, series, and docs.

## Search
- The search page uses navigation metadata and blog post summaries to provide site-wide search.

<details class="doc-accordion">
  <summary>What is cached and why</summary>
  <p>
    Markdown output and summaries are generated at build time. Telemetry APIs rely on
    <code>lib/cacheStore.ts</code> for live data caching, inflight dedupe, and rate limit protection.
  </p>
</details>

<table class="doc-table">
  <thead>
    <tr>
      <th>Source</th>
      <th>Primary outputs</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>posts/</td>
      <td>Blog pages, tags, series</td>
      <td>Markdown + frontmatter drive routing.</td>
    </tr>
    <tr>
      <td>docs/</td>
      <td>Docs pages</td>
      <td>Rendered into <code>/docs</code>.</td>
    </tr>
    <tr>
      <td>data/</td>
      <td>Projects, tools, nav</td>
      <td>Typed data for curated sections.</td>
    </tr>
  </tbody>
</table>

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/docs/architecture">
    <span class="doc-card-kicker">System map</span>
    <span class="doc-card-title">Architecture</span>
    <p class="doc-card-text">See how content fits into the larger system.</p>
  </a>
  <a class="doc-card" href="/docs/deployment">
    <span class="doc-card-kicker">Ship it</span>
    <span class="doc-card-title">Deployment</span>
    <p class="doc-card-text">Understand how builds and previews get published.</p>
  </a>
  <a class="doc-card" href="/work-in-progress">
    <span class="doc-card-kicker">Previews</span>
    <span class="doc-card-title">Work in progress</span>
    <p class="doc-card-text">See live preview deployments tied to the pipeline.</p>
  </a>
  <a class="doc-card" href="/projects">
    <span class="doc-card-kicker">Interactive</span>
    <span class="doc-card-title">Project details</span>
    <p class="doc-card-text">Markdown snapshots powering expanded cards.</p>
  </a>
</div>
