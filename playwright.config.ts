import {defineConfig} from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30000,
    expect: {timeout: 5000},
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    webServer: process.env.PLAYWRIGHT_BASE_URL
        ? undefined
        : {
            command: 'npm run dev',
            port: 3000,
            reuseExistingServer: true,
            timeout: 120000,
            env: {
                ...process.env,
                MOCK_GITHUB_DATA_PATH: 'tests/e2e/fixtures/github-repos.json',
            },
        },
});
