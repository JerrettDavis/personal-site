import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('work in progress page shows previews and refresh controls', async ({page}) => {
    await page.goto('/work-in-progress');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const previews = page.locator('main article[data-status]');
    await expect(previews.first()).toBeVisible();
    const prPreviews = page.locator('main article[data-pr="true"]');
    const prCount = await prPreviews.count();
    expect(prCount).toBeGreaterThan(0);
    await expect(page.getByRole('button', {name: 'Refresh', exact: true})).toBeVisible();
});
