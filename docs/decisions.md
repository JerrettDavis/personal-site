---
title: Decisions and tradeoffs
description: Why the site favors static generation and file-based content.
order: 4
---

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
- Projects, tools, hobbies, and navigation are tracked in `data/` to keep them explicit and typed.
