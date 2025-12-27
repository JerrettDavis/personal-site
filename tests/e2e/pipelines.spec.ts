import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('pipelines page shows mocked repo activity', async ({page}) => {
    await page.goto('/pipelines');
    await expect(page.getByRole('heading', {name: 'Pipeline status'})).toBeVisible();
    const repoSection = page.getByRole('heading', {name: 'Repo activity'}).locator('..');
    await expect(repoSection).toBeVisible();
    await expect(repoSection.getByRole('link', {name: 'personal-site'})).toBeVisible();
    await expect(repoSection.getByRole('link', {name: 'JD.Efcpt.Build'})).toBeVisible();
});
