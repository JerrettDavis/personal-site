import {test, expect} from '@playwright/test';

test('unknown routes show the 404 page', async ({page}) => {
    await page.goto('/this-route-should-not-exist');
    await expect(page.locator('a[href="/"]')).toBeVisible();
});
