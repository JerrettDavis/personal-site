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
});
