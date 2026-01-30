"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ScrollHint() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);

        // Hide after user scrolls
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setVisible(false);
            } else {
                setVisible(true);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!visible) return null;

    return (
        <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 2, duration: 1 }}
        >
            <span className="text-[10px] uppercase tracking-[0.3em] font-medium">
                Scroll
            </span>
            <motion.div
                animate={
                    prefersReducedMotion
                        ? {}
                        : {
                            y: [0, 4, 0],
                        }
                }
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="opacity-60"
                >
                    <path d="M6 2L6 10M6 10L2 6M6 10L10 6" />
                </svg>
            </motion.div>
        </motion.div>
    );
}
