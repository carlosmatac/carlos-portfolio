"use client";

import { useCallback } from "react";

/** Scroll suave entre las secciones de la única página del sitio. */
export function useSmoothScroll() {
    const scrollToSection = useCallback((sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (!element) return;
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState({}, "", `#${sectionId}`);
    }, []);

    const scrollToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.pushState({}, "", "/");
    }, []);

    return { scrollToSection, scrollToTop };
}
