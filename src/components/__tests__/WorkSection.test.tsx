import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkSection from '../WorkSection';
import { projects } from '@/content/projects';

describe('WorkSection', () => {
    it('lists every project', () => {
        render(<WorkSection />);
        projects.forEach((p) => {
            expect(screen.getByText(p.title)).toBeInTheDocument();
        });
    });

    it('links each project title straight to its repo instead of a case study page', () => {
        render(<WorkSection />);
        projects.forEach((p) => {
            const href = p.links?.[0]?.href;
            if (!href) return;
            const title = screen.getByText(p.title);
            expect(title).toHaveAttribute('href', href);
            expect(href).not.toContain('/work/');
        });
    });

    it('shows the repo links for a project that has two of them', () => {
        render(<WorkSection />);
        const multi = projects.find((p) => (p.links?.length ?? 0) > 1);
        expect(multi).toBeDefined();
        const row = screen.getByText(multi!.title).closest('li');
        expect(row).not.toBeNull();
        multi!.links!.forEach((link) => {
            expect(within(row!).getByText(new RegExp(link.label, 'i'))).toBeInTheDocument();
        });
    });
});
