import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('command palette opens with keyboard shortcut', async ({page}) => {
    await page.goto('/');
    await page.click('body');
    await page.evaluate(() => {
        document.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'k',
                ctrlKey: true,
                metaKey: true,
            }),
        );
    });
    const dialog = page.getByRole('dialog', {name: 'Command palette'});
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', {name: 'Close', exact: true}).click();
    await expect(dialog).toBeHidden();
});
