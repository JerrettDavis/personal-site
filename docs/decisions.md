---
title: Decisions and tradeoffs
description: Why the site favors static generation and file-based content.
order: 4
---
<div class="doc-callout">
  <div class="doc-callout-title">Design principles</div>
  <div class="doc-callout-body">
    The project favors clarity and speed over heavy runtime complexity. These decisions keep the
    site fast, predictable, and easy to extend.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Static first</span>
    <span class="doc-badge">Minimal deps</span>
    <span class="doc-badge">Typed data</span>
    <span class="doc-badge">Cache aware</span>
  </div>
</div>

<div class="doc-grid">
  <div class="doc-card">
    <span class="doc-card-kicker">Rendering</span>
    <span class="doc-card-title">Static-first pages</span>
    <p class="doc-card-text">Most routes are pre-rendered to keep TTFB and layout stable.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">Content</span>
    <span class="doc-card-title">File-based markdown</span>
    <p class="doc-card-text">Keeps content versioned and reviewed alongside code.</p>
  </div>
  <div class="doc-card">
    <span class="doc-card-kicker">Data</span>
    <span class="doc-card-title">Structured, typed lists</span>
    <p class="doc-card-text">Projects and tooling stay explicit in <code>data/</code>.</p>
  </div>
</div>

## Static-first rendering
- Most pages are statically generated to keep performance predictable and hosting simple.
- Server-side rendering is reserved for endpoints that need on-demand data, such as the sitemap.

## File-based content
- Posts and documentation live in the repository to keep content versioned alongside code.
- Markdown frontmatter provides a low-friction way to add metadata without a CMS.

## Minimal content tooling
- The markdown pipeline stays close to the default unified/remark/rehype stack.
- Only a small set of plugins are used for syntax highlighting and heading anchors.

## Structured data for curated sections
- Projects, tools, hobbies, and navigation are tracked in <code>data/</code> to keep them explicit and typed.

<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">Principle: speed</div>
    <div class="doc-step-meta">Optimize for fast loads and predictable rendering.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Principle: clarity</div>
    <div class="doc-step-meta">Keep content and metadata close to the codebase.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">Principle: observability</div>
    <div class="doc-step-meta">Expose build and repo signals without extra services.</div>
  </li>
</ul>

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/docs/architecture">
    <span class="doc-card-kicker">System map</span>
    <span class="doc-card-title">Architecture</span>
    <p class="doc-card-text">See how the principles show up in the layout.</p>
  </a>
  <a class="doc-card" href="/docs/tech-stack">
    <span class="doc-card-kicker">Stack</span>
    <span class="doc-card-title">Tech stack</span>
    <p class="doc-card-text">Tools and frameworks selected for speed and clarity.</p>
  </a>
  <a class="doc-card" href="/docs/deployment">
    <span class="doc-card-kicker">Ops</span>
    <span class="doc-card-title">Deployment</span>
    <p class="doc-card-text">How previews and telemetry stay lightweight.</p>
  </a>
  <a class="doc-card" href="/projects">
    <span class="doc-card-kicker">Projects</span>
    <span class="doc-card-title">Data-driven UI</span>
    <p class="doc-card-text">Examples of structured data powering content.</p>
  </a>
</div>
