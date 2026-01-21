import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';
import { TextModeProvider } from '../TextModeProvider';
import { ThemeProvider } from '../ThemeProvider';
import { describe, it, expect, vi } from 'vitest';

// Mock Next.js Link
vi.mock('next/link', () => {
    return {
        default: ({ children, href }: { children: React.ReactNode; href: string }) => (
            <a href={href}>{children}</a>
        ),
    };
});

const renderHeader = () => {
    return render(
        <ThemeProvider>
            <TextModeProvider>
                <Header />
            </TextModeProvider>
        </ThemeProvider>
    );
};

describe('Header Component', () => {
    it('renders the site title', () => {
        renderHeader();
        expect(screen.getByText(/CARLOS MATA/i)).toBeInTheDocument();
    });

    it('renders navigation links', () => {
        renderHeader();
        expect(screen.getByText(/WORK/i)).toBeInTheDocument();
        expect(screen.getByText(/ABOUT/i)).toBeInTheDocument();
        expect(screen.getByText(/CONTACT/i)).toBeInTheDocument();
    });

    it('renders Text Mode toggle button', () => {
        renderHeader();
        const toggleBtn = screen.getByText(/TEXT MODE/i);
        expect(toggleBtn).toBeInTheDocument();
    });

    // Note: Testing the actual toggle functionality might require mocking the context or interacting with it more deeply,
    // but for a UI component test, checking presence is a good first step.
});
