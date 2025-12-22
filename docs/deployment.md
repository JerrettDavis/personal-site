---
title: Deployment
description: Build, hosting, and environment configuration.
order: 5
---

## Hosting
- The site is designed for Vercel hosting and static delivery.
- The build output includes static assets in `public/` and pre-rendered routes.

## Build steps
- `npm run build` runs the Next.js production build.
- `npm run start` serves the compiled site locally.

## Environment configuration
- `NEXT_PUBLIC_SITE_URL` controls canonical URLs in the sitemap.
- RSS feed generation uses the deployment environment to choose the base URL.
