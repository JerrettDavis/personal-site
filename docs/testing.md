---
title: Testing
description: Browser and unit test coverage for the site.
order: 6
---
## What we cover
- Unit and component tests live under `__tests__/`.
- End-to-end coverage uses Playwright under `tests/e2e/`.

## Running tests
- `npm run test` for Jest.
- `npm run test:e2e` for Playwright (spins up `npm run dev` unless `PLAYWRIGHT_BASE_URL` is set).
- First time only: `npx playwright install` to fetch browsers.

## Local fixtures
- `MOCK_GITHUB_DATA_PATH` points to JSON fixtures that bypass GitHub API calls in tests.
- The Playwright config defaults this to `tests/e2e/fixtures/github-repos.json`.
- If you use `PLAYWRIGHT_BASE_URL`, make sure the server you point to has either
  `MOCK_GITHUB_DATA_PATH` set or valid GitHub credentials.

## Notes
- E2E tests mock telemetry API routes in the browser to keep runs deterministic.
