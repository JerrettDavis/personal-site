# My Personal Site (JerrettDavis.com)

![Vercel](https://vercelbadge.vercel.app/api/jerrettdavis/personal-site)
[![GitHub deployments](https://img.shields.io/github/deployments/jerrettdavis/personal-site/production?label=production)](https://github.com/jerrettdavis/personal-site/deployments/activity_log?environment=Production)

## Overview
This repository contains the Next.js implementation of JerrettDavis.com. The site is static-first,
keeps content in the repo, and focuses on a clean, readable presentation of writing, projects, and
personal notes.

## Technology
The site uses Next.js (pages router) with React and TypeScript. Markdown content is parsed with
gray-matter and rendered through the unified/remark/rehype pipeline, with highlight.js providing
syntax highlighting. Styling is handled with CSS modules and targeted Emotion styles. Font Awesome
supplies iconography, and Vercel Analytics provides lightweight analytics.

## Content and structure
- `posts/` holds blog posts as markdown with frontmatter.
- `docs/` holds technical documentation that renders at `/docs`.
- `data/` contains typed content for navigation, projects, tools, and hobbies.
- `pages/` defines routes and page composition.
- `public/` contains static assets, the RSS/Atom/JSON feeds, and site icons.

## Documentation
The `/docs` folder is built into the site and also readable directly from the repository. See the
rendered docs at `/docs` and update the markdown files when architecture or tooling changes.

## Development
Prerequisites: Node.js and npm.

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run start`

## Testing
- `npm run test` for unit tests.
- `npm run test:e2e` for Playwright end-to-end checks (runs `npm run dev` unless `PLAYWRIGHT_BASE_URL` is set).
- First time only: `npx playwright install` to download browsers.

## Deployment
This project is designed for Vercel hosting. Set `NEXT_PUBLIC_SITE_URL` to control the canonical
base URL used in sitemap generation.

## Syndication
The site includes automated syndication to Hashnode and Dev.to. See [SYNDICATION.md](./SYNDICATION.md)
for detailed setup instructions and configuration options. Key features:
- Automatic publishing to external platforms after deployment
- Per-post syndication control via frontmatter
- Tag/category filtering
- Dry-run mode for testing
- State tracking to prevent duplicates

## Telemetry
The site surfaces live build and repo telemetry via API routes under `/api`. Configure the
following optional environment variables to avoid anonymous rate limits:

- `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` for preview/build status.
- `GITHUB_TOKEN` for GitHub Actions pipelines and project detail snapshots.
