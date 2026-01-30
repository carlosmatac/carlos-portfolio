"use client";

import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";

interface SectionProps {
    id: string;
    children: ReactNode;
    className?: string;
    ariaLabel?: string;
    fullHeight?: boolean;
}

export default function Section({
    id,
    children,
    className = "",
    ariaLabel,
    fullHeight = false,
}: SectionProps) {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, []);

    return (
        <motion.section
            id={id}
            aria-label={ariaLabel || `${id} section`}
            tabIndex={-1}
            className={`scroll-mt-20 ${fullHeight ? "min-h-[calc(100vh-69px)] flex flex-col justify-center" : ""} ${className}`}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
                duration: prefersReducedMotion ? 0 : 0.6,
                ease: [0.22, 1, 0.36, 1],
            }}
        >
            {children}
        </motion.section>
    );
}
