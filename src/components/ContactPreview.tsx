"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { site } from "@/content/site";
import { useEffect, useState } from "react";

export default function ContactPreview() {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const mailto = `mailto:${site.email}`;

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        setPrefersReducedMotion(mediaQuery.matches);
    }, []);

    return (
        <div className="py-20 md:py-32">
            {/* Section Header */}
            <div className="border-b border-[rgb(var(--line)/0.2)] pb-8 mb-12 md:mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-medium tracking-tight mb-4">
                    Let's Work Together
                </h2>
                <p className="text-sm uppercase tracking-[0.15em] font-medium opacity-60">
                    Get in Touch
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16">
                {/* Left Column: Direct Contact */}
                <motion.div
                    className="md:col-span-4 space-y-8"
                    initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{
                        duration: prefersReducedMotion ? 0 : 0.5,
                        delay: prefersReducedMotion ? 0 : 0.1,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                >
                    <div>
                        <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">
                            Direct
                        </h3>
                        <a
                            href={mailto}
                            className="block text-lg font-medium hover:opacity-50 transition-opacity"
                        >
                            {site.email}
                        </a>
                    </div>

                    <div>
                        <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">
                            Socials
                        </h3>
                        <div className="flex flex-col gap-3 text-sm font-medium opacity-80">
                            <a
                                href={site.links.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:opacity-50 transition-opacity"
                            >
                                LinkedIn ↗
                            </a>
                            <a
                                href={site.links.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:opacity-50 transition-opacity"
                            >
                                GitHub ↗
                            </a>
                        </div>
                    </div>
                </motion.div>

                {/* Right Column: Statement */}
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
                    <p className="text-xl md:text-2xl leading-relaxed font-serif mb-8">
                        The best way to reach me is via email. I'm always open to discussing{" "}
                        <span className="italic">new opportunities</span>,{" "}
                        <span className="italic">collaborations</span>, or just chatting about systems engineering.
                    </p>

                    <a
                        href={mailto}
                        className="inline-block border-b border-[rgb(var(--line))] pb-1 hover:opacity-50 transition-opacity uppercase tracking-widest text-sm font-bold"
                    >
                        Send Email →
                    </a>
                </motion.div>
            </div>

            {/* Additional CTA to full page */}
            <div className="mt-16 pt-8 border-t border-[rgb(var(--line)/0.1)] text-center">
                <Link
                    href="/contact"
                    className="inline-block hover:opacity-50 transition-opacity uppercase tracking-widest text-xs font-medium opacity-60"
                >
                    View Full Contact Page →
                </Link>
            </div>
        </div>
    );
}
