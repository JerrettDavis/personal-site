---
title: Testing
description: Browser and unit test coverage for the site.
order: 10
---
<div class="doc-callout">
  <div class="doc-callout-title">Confidence loop</div>
  <div class="doc-callout-body">
    Tests aim to validate core behaviors without binding to fragile layout details. The goal is
    fast feedback, stable assertions, and minimal flake.
  </div>
  <div class="doc-badge-row">
    <span class="doc-badge">Jest</span>
    <span class="doc-badge">Playwright</span>
    <span class="doc-badge">Fixtures</span>
    <span class="doc-badge">Deterministic</span>
  </div>
</div>

## What we cover
- Unit and component tests live under <code>__tests__/</code>.
- End-to-end coverage uses Playwright under <code>tests/e2e/</code>.

## Running tests
- <code>npm run test</code> for Jest.
- <code>npm run test:coverage</code> for Jest coverage reports.
- <code>npm run test:e2e</code> for Playwright (spins up <code>npm run dev</code> unless <code>PLAYWRIGHT_BASE_URL</code> is set).
- <code>npm run test:e2e:ui</code> to debug Playwright runs interactively.
- First time only: <code>npx playwright install</code> to fetch browsers.

<ul class="doc-steps">
  <li class="doc-step">
    <div class="doc-step-title">01. Boot the app</div>
    <div class="doc-step-meta">Use the dev server or <code>PLAYWRIGHT_BASE_URL</code>.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">02. Run suites</div>
    <div class="doc-step-meta">Jest for units, Playwright for flows and navigation.</div>
  </li>
  <li class="doc-step">
    <div class="doc-step-title">03. Review artifacts</div>
    <div class="doc-step-meta">Trace, screenshots, and log output in <code>test-results/</code>.</div>
  </li>
</ul>

<details class="doc-accordion">
  <summary>Determinism tips</summary>
  <ul>
    <li>Prefer role-based selectors and avoid brittle text matching.</li>
    <li>Mock telemetry APIs when data might change.</li>
    <li>Keep animation timing stable and avoid fixed waits.</li>
  </ul>
</details>

<table class="doc-table">
  <thead>
    <tr>
      <th>Command</th>
      <th>Purpose</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>npm run test</td>
      <td>Unit and component tests</td>
      <td>Fast feedback for shared helpers.</td>
    </tr>
    <tr>
      <td>npm run test:coverage</td>
      <td>Coverage report</td>
      <td>Outputs HTML to <code>coverage/</code>.</td>
    </tr>
    <tr>
      <td>npm run test:e2e</td>
      <td>Browser flows</td>
      <td>Uses fixtures for telemetry APIs.</td>
    </tr>
    <tr>
      <td>npm run test:e2e:ui</td>
      <td>Playwright UI mode</td>
      <td>Interactive explorer for debugging.</td>
    </tr>
  </tbody>
</table>

## Local fixtures
- <code>MOCK_GITHUB_DATA_PATH</code> points to JSON fixtures that bypass GitHub API calls in tests.
- The Playwright config defaults this to <code>tests/e2e/fixtures/github-repos.json</code>.
- If you use <code>PLAYWRIGHT_BASE_URL</code>, make sure the server you point to has either <code>MOCK_GITHUB_DATA_PATH</code> set or valid GitHub credentials.

## Notes
- E2E tests mock telemetry API routes in the browser to keep runs deterministic.

## Related links
<div class="doc-grid">
  <a class="doc-card" href="/projects">
    <span class="doc-card-kicker">Coverage</span>
    <span class="doc-card-title">Project details</span>
    <p class="doc-card-text">Test the expandable card interactions.</p>
  </a>
  <a class="doc-card" href="/projects#pipeline-metrics">
    <span class="doc-card-kicker">Telemetry</span>
    <span class="doc-card-title">Pipeline status</span>
    <p class="doc-card-text">Validate live status and mock data flows.</p>
  </a>
  <a class="doc-card" href="/docs/deployment">
    <span class="doc-card-kicker">Ops</span>
    <span class="doc-card-title">Deployment</span>
    <p class="doc-card-text">Testing expectations tied to release flow.</p>
  </a>
  <a class="doc-card" href="/docs/tech-stack">
    <span class="doc-card-kicker">Stack</span>
    <span class="doc-card-title">Tech stack</span>
    <p class="doc-card-text">See what frameworks are under test.</p>
  </a>
</div>
