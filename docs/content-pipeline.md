---
title: Content pipeline
description: How markdown becomes pages, feeds, and search data.
order: 3
---

## Blog posts
- Blog content lives in `posts/` as markdown with frontmatter.
- `lib/posts.ts` loads, parses, and converts markdown into HTML.
- Metadata drives tags, categories, series, and listing pages.
- Reading time is derived from word counts during rendering.

## Documentation
- Documentation lives in `docs/` as markdown with frontmatter.
- `lib/docs.ts` loads documentation content and renders it for `/docs` routes.
- The docs index pulls in `docs/index.md` as the landing page.

## Feeds and metadata
- `utils/generateRSSFeed.ts` builds RSS, Atom, and JSON feeds into `public/`.
- `pages/sitemap.xml.tsx` composes sitemap entries for posts, tags, categories, series, and docs.

## Search
- The search page uses navigation metadata and blog post summaries to provide site-wide search.
