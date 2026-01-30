"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { projects } from "@/content/projects";
import { useEffect, useState } from "react";

export default function WorkPreview() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Show only 3 featured projects
    const featuredProjects = projects.slice(0, 3);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);
    }, []);

    return (
        <div className="py-20 md:py-32">
            {/* Section Header */}
            <div className="border-b border-[rgb(var(--line)/0.2)] pb-8 mb-12 md:mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-medium tracking-tight mb-4">
                    Selected Work
                </h2>
                <p className="text-sm uppercase tracking-[0.15em] font-medium opacity-60">
                    Featured Projects
                </p>
            </div>

            {/* Projects Grid - 3 column editorial layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-16">
                {featuredProjects.map((project, index) => (
                    <motion.div
                        key={project.slug}
                        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{
                            duration: prefersReducedMotion ? 0 : 0.5,
                            delay: prefersReducedMotion ? 0 : index * 0.1,
                            ease: [0.22, 1, 0.36, 1],
                        }}
                        className="group"
                    >
                        {/* Project Card */}
                        <Link href={`/work/${project.slug}`} className="block">
                            {/* Thumbnail placeholder */}
                            <div className="aspect-[4/3] bg-[rgb(var(--fg)/0.03)] border border-[rgb(var(--line)/0.1)] mb-6 flex items-center justify-center group-hover:border-[rgb(var(--line)/0.3)] transition-colors">
                                <span className="text-xs uppercase tracking-widest opacity-30">
                                    {project.status}
                                </span>
                            </div>

                            {/* Project Info */}
                            <div className="space-y-2">
                                <div className="flex items-baseline justify-between">
                                    <h3 className="text-sm font-bold uppercase tracking-wider group-hover:opacity-60 transition-opacity">
                                        {project.title}
                                    </h3>
                                    <span className="text-xs opacity-40">{project.year}</span>
                                </div>
                                <p className="text-sm opacity-60 leading-relaxed">
                                    {project.oneLiner}
                                </p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {project.tags.slice(0, 3).map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-[10px] uppercase tracking-wider opacity-40 border border-[rgb(var(--line)/0.1)] px-2 py-0.5"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* CTA */}
            <div className="text-center">
                <Link
                    href="/work"
                    className="inline-block border-b border-[rgb(var(--line))] pb-1 hover:opacity-50 transition-opacity uppercase tracking-widest text-sm font-bold"
                >
                    View All Projects →
                </Link>
            </div>
        </div>
    );
}
