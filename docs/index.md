---
title: Documentation
description: Engineering notes that explain how the personal site is built and why.
order: 0
---
This folder documents the technical structure of the site, the content model, and the decisions that
shape the build. The material is written to be readable in the repository and rendered at `/docs`
when the site is built.

<div class="doc-section-grid">
  <section class="doc-section">
    <h2>Start here</h2>
    <div class="doc-grid">
      <a class="doc-card" href="/docs/architecture">
        <span class="doc-card-kicker">System map</span>
        <span class="doc-card-title">Architecture</span>
        <p class="doc-card-text">See the major layers, routes, and shared layout decisions.</p>
      </a>
      <a class="doc-card" href="/docs/content-pipeline">
        <span class="doc-card-kicker">Content flow</span>
        <span class="doc-card-title">Content pipeline</span>
        <p class="doc-card-text">Follow how markdown becomes pages, feeds, and search metadata.</p>
      </a>
      <a class="doc-card" href="/docs/deployment">
        <span class="doc-card-kicker">Ship it</span>
        <span class="doc-card-title">Deployment</span>
        <p class="doc-card-text">Learn how builds, previews, and telemetry connect end to end.</p>
      </a>
      <a class="doc-card" href="/docs/syndication">
        <span class="doc-card-kicker">Cross-post</span>
        <span class="doc-card-title">Syndication</span>
        <p class="doc-card-text">Automated publishing to Hashnode and Dev.to with canonical URLs.</p>
      </a>
    </div>
  </section>
  <section class="doc-section">
    <h2>Live demos</h2>
    <div class="doc-grid">
      <a class="doc-card" href="/projects#pipeline-metrics">
        <span class="doc-card-kicker">Telemetry</span>
        <span class="doc-card-title">Pipeline status</span>
        <p class="doc-card-text">See live build and repo activity signals.</p>
      </a>
      <a class="doc-card" href="/work-in-progress">
        <span class="doc-card-kicker">Previews</span>
        <span class="doc-card-title">Work in progress</span>
        <p class="doc-card-text">Preview deployments and active branches.</p>
      </a>
      <a class="doc-card" href="/projects">
        <span class="doc-card-kicker">Interactive</span>
        <span class="doc-card-title">Project detail views</span>
        <p class="doc-card-text">Expand cards and load markdown snapshots.</p>
      </a>
    </div>
  </section>
  <section class="doc-section">
    <h2>Explore the stack</h2>
    <div class="doc-grid">
      <a class="doc-card" href="/docs/tech-stack">
        <span class="doc-card-kicker">Technology</span>
        <span class="doc-card-title">Tech stack</span>
        <p class="doc-card-text">Frameworks, libraries, and services in use.</p>
      </a>
      <a class="doc-card" href="/tools">
        <span class="doc-card-kicker">Tooling</span>
        <span class="doc-card-title">Tools library</span>
        <p class="doc-card-text">Categories of software and services we lean on.</p>
      </a>
      <a class="doc-card" href="/projects">
        <span class="doc-card-kicker">Projects</span>
        <span class="doc-card-title">Live examples</span>
        <p class="doc-card-text">Where the stack and tools show up in practice.</p>
      </a>
    </div>
  </section>
  <section class="doc-section doc-section-wide">
    <h2>How the docs fit together</h2>
    <ul class="doc-steps">
      <li class="doc-step">
        <div class="doc-step-title">01. Foundation</div>
        <div class="doc-step-meta">Tech stack and architecture set the ground rules.</div>
      </li>
      <li class="doc-step">
        <div class="doc-step-title">02. Content systems</div>
        <div class="doc-step-meta">Pipeline and docs explain how content becomes pages.</div>
      </li>
      <li class="doc-step">
        <div class="doc-step-title">03. Operations</div>
        <div class="doc-step-meta">Deployment, telemetry, and testing keep things stable.</div>
      </li>
    </ul>
    <div class="doc-diagram">
      <div class="doc-diagram-node">Markdown + data</div>
      <div class="doc-diagram-node">Build pipeline</div>
      <div class="doc-diagram-node">Static pages</div>
      <div class="doc-diagram-node">Telemetry + search</div>
    </div>
  </section>
  <section class="doc-section doc-section-wide">
    <h2>Sections</h2>
    <ul class="doc-list">
      <li>Tech stack overview</li>
      <li>Architecture and routing map</li>
      <li>Content pipeline and frontmatter conventions</li>
      <li>Decisions and tradeoffs</li>
      <li>Deployment and operational notes</li>
      <li>Telemetry, caching, and API integrations</li>
      <li>Testing and QA</li>
    </ul>
  </section>
</div>

<div class="doc-callout">
  <div class="doc-callout-title">Read this like a walkthrough</div>
  <div class="doc-callout-body">
    Each page is a focused slice of the system. Start with architecture, follow the content
    pipeline, and then explore deployment and testing to understand how everything stays fast
    and observable.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Static first</span>
    <span class="doc-badge">Data driven</span>
    <span class="doc-badge">Telemetry aware</span>
    <span class="doc-badge">Cache conscious</span>
  </div>
</div>
