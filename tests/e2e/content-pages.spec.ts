import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('about page renders sections and cards', async ({page}) => {
    await page.goto('/about-me');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const sections = page.locator('main section');
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThan(2);
    const cards = page.locator('main article');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(2);
});

test('tools page lists categories and items', async ({page}) => {
    await page.goto('/tools');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const categories = page.locator('main article');
    const categoryCount = await categories.count();
    expect(categoryCount).toBeGreaterThan(0);
    const items = page.locator('main li');
    const itemCount = await items.count();
    expect(itemCount).toBeGreaterThan(5);
});

test('hobbies page shows hero and hobby cards', async ({page}) => {
    await page.goto('/hobbies');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const sections = page.locator('main section');
    const sectionCount = await sections.count();
    expect(sectionCount).toBeGreaterThan(2);
    const hobbyCards = page.locator('main article');
    const hobbyCardCount = await hobbyCards.count();
    expect(hobbyCardCount).toBeGreaterThan(2);
});
