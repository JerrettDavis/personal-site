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
