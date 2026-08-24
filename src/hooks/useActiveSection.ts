"use client";

import { useEffect, useState } from "react";

const THRESHOLDS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

/**
 * Devuelve el id de la sección más visible. El sitio es una sola página, así
 * que no hay rutas que vigilar: basta con observar las secciones.
 */
export function useActiveSection(sectionIds: string[]) {
    const [activeSection, setActiveSection] = useState<string>(sectionIds[0] ?? "");

    useEffect(() => {
        const ratios = new Map<string, number>();

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    ratios.set(entry.target.id, entry.intersectionRatio);
                }

                let maxRatio = 0;
                let mostVisible = "";
                ratios.forEach((ratio, id) => {
                    if (ratio > maxRatio) {
                        maxRatio = ratio;
                        mostVisible = id;
                    }
                });

                if (maxRatio > 0.1 && mostVisible) {
                    setActiveSection(mostVisible);
                }
            },
            {
                threshold: THRESHOLDS,
                // Descuenta la cabecera fija y el último tramo de la ventana.
                rootMargin: "-80px 0px -20% 0px",
            }
        );

        for (const id of sectionIds) {
            const element = document.getElementById(id);
            if (element) observer.observe(element);
        }

        return () => observer.disconnect();
    }, [sectionIds]);

    return activeSection;
}
