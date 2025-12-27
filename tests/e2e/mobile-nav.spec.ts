import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('mobile nav opens and shows links', async ({page}) => {
    await page.setViewportSize({width: 375, height: 812});
    await page.goto('/');
    const menuButton = page.getByRole('button', {name: /menu/i});
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const mobileNav = page.getByRole('navigation', {name: 'Mobile'});
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', {name: 'Projects'})).toBeVisible();
});
