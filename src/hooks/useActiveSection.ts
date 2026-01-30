"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export function useActiveSection(sectionIds: string[]) {
    const pathname = usePathname();
    const isHome = pathname === "/";

    // Default to first section (hero) when on home, empty when not
    const [activeSection, setActiveSection] = useState<string>(() =>
        isHome ? sectionIds[0] || "" : ""
    );
    const sectionIdsRef = useRef(sectionIds);

    useEffect(() => {
        sectionIdsRef.current = sectionIds;
    }, [sectionIds]);

    // Reset active section when navigating to/from home
    useEffect(() => {
        if (isHome) {
            // When returning to home, reset to first section and let observer update
            setActiveSection(sectionIds[0] || "");
        } else {
            // When leaving home, clear active section
            setActiveSection("");
        }
    }, [pathname, isHome, sectionIds]);

    // Force recalculation when returning to home
    const recalculateActiveSection = useCallback(() => {
        if (!isHome) return;

        let maxRatio = 0;
        let mostVisibleSection = sectionIdsRef.current[0];

        sectionIdsRef.current.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                const rect = element.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
                const ratio = Math.max(0, visibleHeight / element.offsetHeight);

                if (ratio > maxRatio) {
                    maxRatio = ratio;
                    mostVisibleSection = id;
                }
            }
        });

        if (maxRatio > 0.1) {
            setActiveSection(mostVisibleSection);
        }
    }, [isHome]);

    useEffect(() => {
        // Only observe on home page
        if (!isHome) return;

        // Immediately calculate on mount/route change
        recalculateActiveSection();

        // Track visibility ratios for all sections
        const visibilityRatios = new Map<string, number>();

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    visibilityRatios.set(entry.target.id, entry.intersectionRatio);
                });

                // Find the section with highest visibility
                let maxRatio = 0;
                let mostVisibleSection = sectionIdsRef.current[0];

                visibilityRatios.forEach((ratio, id) => {
                    if (ratio > maxRatio) {
                        maxRatio = ratio;
                        mostVisibleSection = id;
                    }
                });

                // Only update if there's meaningful visibility
                if (maxRatio > 0.1) {
                    setActiveSection(mostVisibleSection);
                }
            },
            {
                threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
                rootMargin: "-80px 0px -20% 0px", // Account for sticky header
            }
        );

        sectionIds.forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                observer.observe(element);
            }
        });

        return () => {
            observer.disconnect();
        };
    }, [sectionIds, isHome, recalculateActiveSection]);

    return activeSection;
}
