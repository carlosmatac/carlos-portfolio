import { render, screen } from '@testing-library/react';
import ProjectCard from '../ProjectCard';
import { TextModeProvider } from '../TextModeProvider';
import { describe, it, expect, vi } from 'vitest';

// Mock Next.js Link and Image
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('next/image', () => ({
    default: ({ src, alt }: { src: string; alt: string }) => (
        <img src={src} alt={alt} />
    ),
}));

const mockProject = {
    slug: 'project-alpha',
    title: 'Project Alpha',
    oneLiner: 'A revolutionary project',
    tags: ['React', 'TypeScript'],
    thumb: '/images/alpha.jpg',
    // Add other properties if required by the type, filling with dummies
    description: 'Full description here',
    date: '2023',
    content: <div>Content</div>
};

// We need to match the actual type if it's strict, but for now we pass what we know is used.
// If typescript complains we might need to verify the type definition.
// For the test, we can cast or just match the shape if the component doesn't import the type strictly for checking in the test file (it does import it in implementation).
// Ideally we import the type, but let's try to mock it.

describe('ProjectCard Component', () => {
    it('renders project title and description', () => {
        // We wrap in TextModeProvider as the component might use it
        render(
            <TextModeProvider>
                <ProjectCard p={mockProject as any} />
            </TextModeProvider>
        );

        expect(screen.getByText(/Project Alpha/i)).toBeInTheDocument();
        expect(screen.getByText(/A revolutionary project/i)).toBeInTheDocument();
    });

    it('renders tags', () => {
        render(
            <TextModeProvider>
                <ProjectCard p={mockProject as any} />
            </TextModeProvider>
        );
        expect(screen.getByText(/React/i)).toBeInTheDocument();
    });
});
