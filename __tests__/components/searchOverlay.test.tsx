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
});
