---
title: Tech stack
description: Core frameworks, libraries, and services that power the site.
order: 1
---

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
