import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('pipelines overview shows telemetry summary', async ({page}) => {
    await page.goto('/projects#pipeline-metrics');
    await expect(page.getByRole('heading', {name: 'Pipeline metrics'})).toBeVisible();
    await expect(page.locator('#pipeline-metrics')).toContainText('Running');
});
