import {getAllDocSlugs, getAllDocSummaries, getDocBySlug} from '../../lib/docs';

describe('docs library', () => {
    it('loads documentation summaries', async () => {
        const docs = await getAllDocSummaries();
        expect(docs.length).toBeGreaterThan(0);
        expect(docs.some((doc) => doc.route === '/docs')).toBe(true);
    });

    it('renders the docs index', async () => {
        const doc = await getDocBySlug([]);
        expect(doc.title.length).toBeGreaterThan(0);
        expect(doc.contentHtml).toContain('<');
    });

    it('lists doc slugs without the root index', async () => {
        const slugs = await getAllDocSlugs();
        expect(slugs.some((slug) => slug.length === 0)).toBe(false);
        expect(slugs).toContainEqual(['architecture']);
    });

    it('throws for missing docs', async () => {
        await expect(getDocBySlug(['does-not-exist'])).rejects.toThrow('Documentation not found');
    });
});
