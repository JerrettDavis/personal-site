import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('home renders shell and live status', async ({page}) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByText('Live status')).toBeVisible();
    await expect(footer.locator('a[data-variant="menu"][href="/work-in-progress"]')).toBeVisible();
    await expect(footer.locator('a[data-variant="menu"][href="/pipelines"]')).toBeVisible();

    const sectionNav = page.locator('nav[aria-label="Section index"] a');
    const count = await sectionNav.count();
    expect(count).toBeGreaterThan(1);
});
