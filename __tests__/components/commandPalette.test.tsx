import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import CommandPalette from '../../components/commandPalette';

describe('CommandPalette', () => {
    it('opens and closes the overlay', async () => {
        render(<CommandPalette />);

        const trigger = screen.getByRole('button', {name: /command/i});
        fireEvent.click(trigger);

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        fireEvent.keyDown(document, {key: 'Escape'});

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    it('filters results and shows empty state', async () => {
        render(<CommandPalette />);

        fireEvent.click(screen.getByRole('button', {name: /command/i}));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'zzzz'}});

        await waitFor(() => {
            expect(screen.getByText(/no matches/i)).toBeInTheDocument();
        });
    });

    it('closes after selecting a result', async () => {
        render(<CommandPalette />);

        fireEvent.click(screen.getByRole('button', {name: /command/i}));

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'docs'}});

        const resultLink = await screen.findByRole('link', {name: /docs overview/i});
        fireEvent.click(resultLink);

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
});
