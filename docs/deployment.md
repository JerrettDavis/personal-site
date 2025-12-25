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
- `npm run test:e2e` runs the Playwright browser suite (expects a local dev server unless `PLAYWRIGHT_BASE_URL` is set).

## Environment configuration
- `NEXT_PUBLIC_SITE_URL` controls canonical URLs in the sitemap.
- RSS feed generation uses the deployment environment to choose the base URL.
- `GITHUB_TOKEN` (optional) boosts GitHub API limits for pipeline and project-detail telemetry.

## Build telemetry (Vercel previews)
- The live build telemetry reads Vercel deployments via the API route at `/api/site-build-status`.
- Required env vars:
  - `VERCEL_TOKEN` (create from Vercel Account Settings -> Tokens).
  - `VERCEL_PROJECT_ID` (Project Settings -> General -> Project ID).
  - `VERCEL_TEAM_ID` (optional, only if the project is under a team).
- Local setup: create `.env.local` with the values above, then run `npm run dev`.
- CI setup: add the same keys as GitHub Actions secrets and pass them through to the Next.js build/deploy job.
- If tokens are missing, the UI will show telemetry as unavailable instead of hard failing.

## GitHub telemetry (pipelines + project details)
- Pipeline status is served from `/api/pipeline-status` and project detail snapshots from `/api/project-details`.
- `GITHUB_TOKEN` is optional but recommended to avoid anonymous rate limits.
- Project detail requests are cached per repo and throttled on refresh to stay under rate limits.
- If the GitHub API is rate limited, the UI will show a cooldown notice and reuse stale cached data.

## Testing configuration
- `MOCK_GITHUB_DATA_PATH` points to a JSON fixture used in tests to avoid live GitHub API calls.
- `PLAYWRIGHT_BASE_URL` skips spinning up `npm run dev` and targets an existing server.
