"use client";

import { useEffect, useState, useRef } from "react";

export function useActiveSection(sectionIds: string[]) {
    const [activeSection, setActiveSection] = useState<string>(sectionIds[0] || "");
    const sectionIdsRef = useRef(sectionIds);

    useEffect(() => {
        sectionIdsRef.current = sectionIds;
    }, [sectionIds]);

    useEffect(() => {
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
    }, [sectionIds]);

    return activeSection;
}
