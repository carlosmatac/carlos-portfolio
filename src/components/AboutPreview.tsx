"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AboutPreview() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);
    }, []);

    return (
        <div className="py-20 md:py-32">
            {/* Section Header */}
            <div className="border-b border-[rgb(var(--line)/0.2)] pb-8 mb-12 md:mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-medium tracking-tight mb-4">
                    About
                </h2>
                <p className="text-sm uppercase tracking-[0.15em] font-medium opacity-60">
                    Who I Am
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
                {/* Left Column: Snapshot */}
                <motion.div
                    className="md:col-span-4"
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                        duration: prefersReducedMotion ? 0 : 0.5,
                        delay: prefersReducedMotion ? 0 : 0.1,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                >
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">
                        Snapshot
                    </h3>
                    <ul className="space-y-4 text-sm font-medium leading-relaxed opacity-80">
                        <li className="flex items-start gap-3">
                            <span className="opacity-30">•</span> Background in software engineering
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="opacity-30">•</span>  Learning about data engineering
                        </li>
                        <li className="flex items-start gap-3">
                            <span className="opacity-30">•</span> Performance, systems, clean UI
                        </li>
                    </ul>
                </motion.div>

                {/* Right Column: Intro */}
                <motion.div
                    className="md:col-span-8"
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                        duration: prefersReducedMotion ? 0 : 0.5,
                        delay: prefersReducedMotion ? 0 : 0.2,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                >
                    <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-40">
                        The Narrative
                    </h3>
                    <div className="space-y-6 text-xl md:text-2xl leading-relaxed font-serif">
                        <p>
                            I'm a software engineer transitioning into data architecture. I enjoy building systems
                            that are <span className="italic">reliable</span>, <span className="italic">understandable</span>, and pleasantly designed.
                        </p>
                        <p>
                            This site is a personal workspace: a curated list of projects, experiments, and case
                            studies. The goal is not "more stuff", but <span className="font-bold">better signal</span>.
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* CTA */}
            <div className="mt-16 text-center">
                <Link
                    href="/about"
                    className="inline-block border-b border-[rgb(var(--line))] pb-1 hover:opacity-50 transition-opacity uppercase tracking-widest text-sm font-bold"
                >
                    Read Full Story →
                </Link>
            </div>
        </div>
    );
}
