import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockProjectDetails, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
    await mockProjectDetails(page);
});

test('project cards expand and render markdown readme', async ({page}) => {
    await page.goto('/projects');
    const card = page
        .locator('article')
        .filter({has: page.getByRole('link', {name: 'Personal Site'})})
        .first();
    await card.click();
    await expect(card).toHaveAttribute('data-expanded', 'true');

    const detailPanel = card.locator('[data-detail-panel="true"]');
    await expect(detailPanel).toBeVisible();
    const readmeBlock = detailPanel.locator('[data-truncated="true"]');
    await expect(readmeBlock).toBeVisible();
    await expect(readmeBlock).toContainText('Intro bold readme summary.');

    const collapseButton = card.getByRole('button', {name: 'Collapse'});
    await collapseButton.click();
    await expect(card).not.toHaveAttribute('data-expanded', 'true');
});
