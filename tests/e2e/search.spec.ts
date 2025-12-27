import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSearchIndex, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
    await mockSearchIndex(page);
});

test('search overlay filters results and navigates', async ({page}) => {
    await page.goto('/');
    const primaryNav = page.getByRole('navigation', {name: 'Primary'});
    await primaryNav.getByRole('button', {name: 'Search'}).click();
    const dialog = page.getByRole('dialog', {name: 'Search'});
    await expect(dialog).toBeVisible();
    await dialog.getByRole('searchbox').fill('Docs');
    const result = dialog.getByRole('link', {name: 'Docs'});
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(/\/docs$/);
});

test('search page filters results from nav labels', async ({page}) => {
    await page.goto('/search');
    const navLink = page.getByRole('navigation', {name: 'Primary'}).getByRole('link').first();
    const label = (await navLink.textContent())?.trim() ?? 'About';
    const href = await navLink.getAttribute('href');
    await page.getByRole('searchbox', {name: 'Search'}).fill(label);
    if (href) {
        await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
    }
});
