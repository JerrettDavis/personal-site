---
title: Architecture
description: How pages, components, and content sources fit together.
order: 2
---

## Routing
- The site uses the Next.js pages router under `pages/`.
- Static pages live at routes like `/about-me`, `/projects`, `/tools`, and `/hobbies`.
- Blog content is rendered from dynamic routes under `/blog`, including tags, categories, and series.
- Documentation renders from `/docs` and `/docs/[...slug]` using markdown in the `docs/` folder.

## Core layout
- `components/layout.tsx` provides the global header, navigation, and page shell.
- Theme switching is handled via a client-side toggle component.
- Page-level effects (reveal, grid tracking, glow hotspots) live in `lib/hooks` and are wired by the layout.

## Content inputs
- `posts/` stores markdown-based blog posts.
- `docs/` stores markdown documentation that is published to the site.
- `data/` holds structured content for projects, tools, navigation, and hobbies.

## Consistency conventions
- Prefer declarative, data-driven rendering from `data/` and `lib/` helpers.
- Keep side effects in shared hooks (`lib/hooks`) instead of in-page ad hoc effects.
- Normalize cross-cutting logic (tag matching, key handling, scroll lock) into reusable utilities.
- Treat markdown pipelines and search index builders as pure functions with explicit inputs/outputs.

## Build output
- `public/` serves static assets, RSS feeds, and the generated sitemap endpoint.
- Next.js handles static generation for content pages and server-side rendering only where needed.
