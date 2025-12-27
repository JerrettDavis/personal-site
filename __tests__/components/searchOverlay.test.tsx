import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import SearchOverlay from '../../components/searchOverlay';

describe('SearchOverlay', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                pages: [
                    {
                        label: 'Docs',
                        href: '/docs',
                        description: 'Architecture notes',
                        keywords: ['architecture'],
                    },
                ],
                posts: [
                    {
                        id: 'post-one',
                        title: 'Launch Notes',
                        summary: 'Details about launch',
                        tags: ['launch'],
                        categories: [],
                        date: '2024-01-01',
                    },
                ],
            }),
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
        jest.resetAllMocks();
        const nextData = document.getElementById('__NEXT_DATA__');
        if (nextData?.parentNode) {
            nextData.parentNode.removeChild(nextData);
        }
    });

    it('fetches search results and filters by query', async () => {
        render(<SearchOverlay label="Search" />);

        const trigger = screen.getByRole('button', {name: /search/i});
        fireEvent.click(trigger);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText(/search posts, pages, and docs/i);
        fireEvent.change(input, {target: {value: 'docs'}});

        await waitFor(() => {
            expect(screen.getByText('Docs')).toBeInTheDocument();
        });
    });

    it('shows empty results when nothing matches', async () => {
        render(<SearchOverlay label="Search" />);

        fireEvent.click(screen.getByRole('button', {name: /search/i}));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        const input = screen.getByPlaceholderText(/search posts, pages, and docs/i);
        fireEvent.change(input, {target: {value: 'nomatch'}});

        await waitFor(() => {
            expect(screen.getByText(/no matching pages/i)).toBeInTheDocument();
            expect(screen.getByText(/no matching posts/i)).toBeInTheDocument();
        });
    });

    it('uses __NEXT_DATA__ build id when available', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                pageProps: {
                    pages: [
                        {
                            label: 'Docs',
                            href: '/docs',
                            description: 'Architecture notes',
                            keywords: ['architecture'],
                        },
                    ],
                    posts: [],
                },
            }),
        });

        const nextData = document.createElement('div');
        nextData.id = '__NEXT_DATA__';
        nextData.textContent = JSON.stringify({buildId: 'build-123'});
        document.body.appendChild(nextData);

        render(<SearchOverlay label="Search" />);

        fireEvent.click(screen.getByRole('button', {name: /search/i}));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe('/_next/data/build-123/search.json');
    });

    it('shows an error when fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            json: async () => ({}),
        });

        render(<SearchOverlay label="Search" />);

        fireEvent.click(screen.getByRole('button', {name: /search/i}));

        await waitFor(() => {
            expect(screen.getByText(/search index unavailable/i)).toBeInTheDocument();
        });
    });
});
