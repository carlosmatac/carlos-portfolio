import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { CaseStudy } from '@/content/projects';
import ProjectCard from '../ProjectCard';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mockProject: CaseStudy = {
  slug: 'project-alpha',
  title: 'Project Alpha',
  oneLiner: 'A concise project summary',
  context: 'A revolutionary project',
  tags: ['React', 'TypeScript'],
  year: '2023',
  role: 'Software Engineer',
  problem: [],
  approach: [],
  outcome: [],
};

describe('ProjectCard Component', () => {
  it('renders the project title and context', () => {
    render(<ProjectCard p={mockProject} />);
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('A revolutionary project')).toBeInTheDocument();
  });
  it('renders tags', () => {
    render(<ProjectCard p={mockProject} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });
});
