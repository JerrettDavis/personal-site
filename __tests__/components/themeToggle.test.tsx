import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import ThemeToggle from '../../components/themeToggle';

describe('ThemeToggle', () => {
    beforeEach(() => {
        document.body.dataset.theme = 'light';
        window.localStorage.clear();
    });

    it('toggles the theme and stores it', async () => {
        render(<ThemeToggle />);

        const button = screen.getByRole('button', {name: /change to dark mode/i});
        fireEvent.click(button);

        await waitFor(() => {
            expect(document.body.dataset.theme).toBe('dark');
            expect(window.localStorage.getItem('theme')).toBe('dark');
        });
    });
});
