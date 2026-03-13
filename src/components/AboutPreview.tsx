"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { timeline } from "@/content/timeline";

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

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 mb-20 md:mb-28">
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
                            <span className="opacity-30">•</span> Transitioning into data architecture
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

            {/* Experience Timeline */}
            <div className="border-t border-[rgb(var(--line)/0.1)] pt-12 md:pt-16">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-10 opacity-40">
                    Experience
                </h3>
                <div className="flex flex-col">
                    {timeline.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-30px" }}
                            transition={{
                                duration: prefersReducedMotion ? 0 : 0.45,
                                delay: prefersReducedMotion ? 0 : index * 0.07,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className={`flex flex-col md:flex-row md:items-baseline gap-2 md:gap-10 py-5 border-t border-[rgb(var(--line)/0.08)] first:border-t-0 ${index === 0 ? "opacity-100" : "opacity-60 hover:opacity-100"} transition-opacity duration-300`}
                        >
                            <span className="w-36 shrink-0 text-[10px] uppercase tracking-[0.2em] font-medium opacity-50">
                                {item.year}
                            </span>
                            <div className="flex flex-col gap-0.5">
                                <span className={`text-sm font-semibold tracking-wide ${index === 0 ? "" : ""}`}>
                                    {item.event}
                                    {index === 0 && (
                                        <span className="ml-2 text-[9px] uppercase tracking-widest text-[rgb(var(--accent))] border border-[rgb(var(--accent)/0.4)] px-1.5 py-0.5 rounded-sm align-middle">
                                            Current
                                        </span>
                                    )}
                                </span>
                                <span className="text-xs opacity-50">{item.role}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
