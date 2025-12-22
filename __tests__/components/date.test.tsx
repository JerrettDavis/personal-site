import {render, screen} from '@testing-library/react';
import Date from '../../components/date';

describe('Date component', () => {
    it('renders a formatted date string', () => {
        render(<Date dateString="2024-01-15" />);
        expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
        expect(screen.getByText('January 15, 2024').tagName).toBe('TIME');
    });
});
