---
title: Tech stack
description: Core frameworks, libraries, and services that power the site.
order: 1
---
<div class="doc-callout">
  <div class="doc-callout-title">Stack snapshot</div>
  <div class="doc-callout-body">
    The stack is intentionally small: a fast React framework, a markdown pipeline, and a few
    integrations for telemetry. This keeps the site sharp and maintainable.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Next.js</span>
    <span class="doc-badge">TypeScript</span>
    <span class="doc-badge">Markdown</span>
    <span class="doc-badge">Vercel</span>
  </div>
</div>

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-card-kicker">Runtime</span>
    <span class="doc-card-title">Next.js + React</span>
    <p class="doc-card-text">Pages router, static generation, and client interactivity.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">Content</span>
    <span class="doc-card-title">Markdown pipeline</span>
    <p class="doc-card-text">gray-matter, unified, remark, rehype, highlight.js.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">UI</span>
    <span class="doc-card-title">CSS modules + Emotion</span>
    <p class="doc-card-text">Scoped styling with targeted component-level overrides.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">Ops</span>
    <span class="doc-card-title">Vercel + GitHub APIs</span>
    <p class="doc-card-text">Telemetry, build previews, and repo activity signals.</p>
  </div>
</div>

## Runtime and framework
- Next.js (pages router) for routing, static generation, and build tooling.
- React for component composition and page structure.
- TypeScript for typed components and data helpers.

## Content tooling
- gray-matter for parsing frontmatter in markdown content.
- unified, remark, and rehype for markdown-to-HTML rendering.
- highlight.js for syntax highlighting in code blocks.
- reading-time (via word count) for post metadata.

## Styling and UI
- CSS modules for page-specific styles.
- Emotion for targeted styled components where needed.
- Font Awesome for iconography.

## Delivery and metadata
- Vercel Analytics for privacy-focused site metrics.
- GitHub + Vercel APIs for build telemetry and on-demand project detail snapshots.
- RSS/Atom/JSON feeds generated during the build.
- Sitemap generation to expose blog, taxonomy, and documentation routes.

## Testing
- Jest for unit and component tests.
- Playwright for browser-based end-to-end coverage.

<table class="doc-table">
  <thead>
    <tr>
      <th>Layer</th>
      <th>Tools</th>
      <th>Why it matters</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Framework</td>
      <td>Next.js, React</td>
      <td>Fast pages with a predictable routing model.</td>
    </tr>
    <tr>
      <td>Content</td>
      <td>gray-matter, unified</td>
      <td>Static content without a CMS.</td>
    </tr>
    <tr>
      <td>Observability</td>
      <td>Vercel, GitHub APIs</td>
      <td>Live pipelines and build status surfaces.</td>
    </tr>
    <tr>
      <td>Quality</td>
      <td>Jest, Playwright</td>
      <td>Unit + E2E coverage to reduce regressions.</td>
    </tr>
  </tbody>
</table>

## Primary references
- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vercel](https://vercel.com/)
- [Playwright](https://playwright.dev/)

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/projects">
    <span class="doc-card-kicker">Projects</span>
    <span class="doc-card-title">Stack in action</span>
    <p class="doc-card-text">See where each technology shows up in the UI.</p>
  </a>
  <a class="doc-card" href="/tools">
    <span class="doc-card-kicker">Tooling</span>
    <span class="doc-card-title">Tools library</span>
    <p class="doc-card-text">Catalog of tools and categories used across the site.</p>
  </a>
  <a class="doc-card" href="/projects#pipeline-metrics">
    <span class="doc-card-kicker">Telemetry</span>
    <span class="doc-card-title">Pipelines</span>
    <p class="doc-card-text">Live status powered by GitHub and Vercel APIs.</p>
  </a>
  <a class="doc-card" href="/docs/architecture">
    <span class="doc-card-kicker">System map</span>
    <span class="doc-card-title">Architecture</span>
    <p class="doc-card-text">Understand how the stack supports the layout.</p>
  </a>
</div>
