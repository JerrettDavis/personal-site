import {getAllDocSummaries, getDocBySlug} from '../../lib/docs';

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
});
