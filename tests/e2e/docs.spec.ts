import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';
import {toPathRegex} from './utils';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('docs index lists documentation cards', async ({page}) => {
    await page.goto('/docs');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const docLinks = page.locator('main a[href^="/docs/"]');
    const docCount = await docLinks.count();
    expect(docCount).toBeGreaterThan(0);
});

test('docs detail renders content', async ({page}) => {
    await page.goto('/docs');
    const docLinks = page.locator('main a[href^="/docs/"]');
    const docCount = await docLinks.count();
    expect(docCount).toBeGreaterThan(0);
    const docLink = docLinks.first();
    const href = await docLink.getAttribute('href');
    await docLink.click();
    if (href) {
        await expect(page).toHaveURL(toPathRegex(href));
    } else {
        await expect(page).toHaveURL(/\/docs\//);
    }
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const contentBlocks = page.locator('main section').last().locator('p, h2, h3, ul, ol');
    const contentCount = await contentBlocks.count();
    expect(contentCount).toBeGreaterThan(0);
});

test('docs navigation updates content on link click', async ({page}) => {
    await page.goto('/docs/architecture');
    const heading = page.getByRole('heading', {level: 1});
    const initialTitle = (await heading.textContent())?.trim();
    const nav = page.locator('aside[aria-label="Documentation navigation"]');
    await nav.getByRole('link', {name: 'Content pipeline'}).dispatchEvent('click');
    await expect(page).toHaveURL(/\/docs\/content-pipeline/);
    await expect(heading).toHaveText(/content pipeline/i);
    if (initialTitle) {
        await expect(heading).not.toHaveText(initialTitle);
    }
});

test('docs page allows header navigation to other pages', async ({page}) => {
    await page.goto('/docs/architecture');
    const headerNav = page.getByRole('navigation', {name: 'Primary'});
    await headerNav.getByRole('link', {name: 'Projects'}).click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
});
