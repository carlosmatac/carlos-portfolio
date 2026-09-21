import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MonitorHero from '../MonitorHero';
import VintageMonitor from '../VintageMonitor';
import { site } from '@/content/site';

describe('VintageMonitor', () => {
    it('muestra dentro del tubo lo que se le pasa', () => {
        render(
            <VintageMonitor>
                <h1>Carlos Mata</h1>
            </VintageMonitor>
        );
        expect(screen.getByRole('heading', { name: 'Carlos Mata' })).toBeInTheDocument();
    });

    it('deja la carcasa fuera del árbol de accesibilidad', () => {
        const { container } = render(
            <VintageMonitor plate="CM / 001">
                <h1>Carlos Mata</h1>
            </VintageMonitor>
        );
        const plate = screen.getByText('CM / 001');
        expect(plate.closest('[aria-hidden="true"]')).not.toBeNull();
        // La sala, la peana y las capas de cristal son decorado, no contenido.
        expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(5);
    });
});

describe('MonitorHero', () => {
    it('pone el nombre y la invitación a seguir bajando', () => {
        render(<MonitorHero />);
        expect(screen.getByRole('heading', { level: 1, name: site.name })).toBeInTheDocument();
        expect(screen.getByText('Scroll to discover')).toBeInTheDocument();
    });
});
