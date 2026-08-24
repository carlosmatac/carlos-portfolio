import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Header from '../Header';

describe('Header', () => {
    it('renders the wordmark', () => {
        render(<Header />);
        expect(screen.getByText('Carlos Mata')).toBeInTheDocument();
    });

    it('renders exactly the two section links', () => {
        render(<Header />);
        const nav = screen.getByRole('navigation', { name: /sections/i });
        const links = within(nav).getAllByRole('link');
        expect(links.map((l) => l.textContent)).toEqual(['About', 'Work']);
    });

    it('does not render the removed Contact link', () => {
        render(<Header />);
        expect(screen.queryByText(/contact/i)).not.toBeInTheDocument();
    });
});
