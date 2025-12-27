import {test, expect} from '@playwright/test';
import {mockPipelineStatus, mockSiteBuildStatus} from './mocks';
import {toPathRegex} from './utils';

test.beforeEach(async ({page}) => {
    await mockPipelineStatus(page);
    await mockSiteBuildStatus(page);
});

test('blog index lists posts and opens a post', async ({page}) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const postLinks = page.locator('main a[href^="/blog/posts/"]');
    const postCount = await postLinks.count();
    expect(postCount).toBeGreaterThan(0);
    const postLink = postLinks.first();
    const href = await postLink.getAttribute('href');
    await postLink.click();
    if (href) {
        await expect(page).toHaveURL(toPathRegex(href));
    } else {
        await expect(page).toHaveURL(/\/blog\/posts\//);
    }
    await expect(page.locator('main article')).toBeVisible();
});

test('blog tag and category pages render lists', async ({page}) => {
    await page.goto('/blog');
    const tagLinks = page.locator('main a[href^="/blog/tags/"]');
    const tagCount = await tagLinks.count();
    if (tagCount > 0) {
        const tagLink = tagLinks.first();
        const tagHref = await tagLink.getAttribute('href');
        await tagLink.click();
        if (tagHref) {
            await expect(page).toHaveURL(toPathRegex(tagHref));
        } else {
            await expect(page).toHaveURL(/\/blog\/tags\//);
        }
        const tagPosts = page.locator('main a[href^="/blog/posts/"]');
        expect(await tagPosts.count()).toBeGreaterThan(0);
    }

    await page.goto('/blog');
    const categoryLinks = page.locator('main a[href^="/blog/categories/"]');
    const categoryCount = await categoryLinks.count();
    if (categoryCount > 0) {
        const categoryLink = categoryLinks.first();
        const categoryHref = await categoryLink.getAttribute('href');
        await categoryLink.click();
        if (categoryHref) {
            await expect(page).toHaveURL(toPathRegex(categoryHref));
        } else {
            await expect(page).toHaveURL(/\/blog\/categories\//);
        }
        const categoryPosts = page.locator('main a[href^="/blog/posts/"]');
        expect(await categoryPosts.count()).toBeGreaterThan(0);
    }
});

test('blog series index and detail render', async ({page}) => {
    await page.goto('/blog/series');
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
    const seriesLinks = page.locator('main a[href^="/blog/series/"]');
    const seriesCount = await seriesLinks.count();
    if (seriesCount > 0) {
        const seriesLink = seriesLinks.first();
        const seriesHref = await seriesLink.getAttribute('href');
        await seriesLink.click();
        if (seriesHref) {
            await expect(page).toHaveURL(toPathRegex(seriesHref));
        } else {
            await expect(page).toHaveURL(/\/blog\/series\//);
        }
        const seriesPosts = page.locator('main a[href^="/blog/posts/"]');
        expect(await seriesPosts.count()).toBeGreaterThan(0);
    }
});
