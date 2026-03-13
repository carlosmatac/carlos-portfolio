"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CaseStudy } from "@/content/projects";

export default function ProjectCard({ p, index = 0 }: { p: CaseStudy; index?: number }) {
  // Find the primary GitHub link from the project links
  const githubLink = p.links?.find(
    (l) => l.href.includes("github.com")
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="group flex flex-col gap-5 border-t border-[rgb(var(--line)/0.12)] pt-6 pb-8
                 hover:border-[rgb(var(--line)/0.4)] transition-colors duration-300"
    >
      {/* Top row: number + year */}
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] opacity-30 font-medium tabular-nums">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] opacity-30 font-medium">
          {p.year}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-serif text-2xl md:text-3xl font-medium tracking-tight leading-none
                     group-hover:opacity-70 transition-opacity duration-300">
        {p.title}
      </h3>

      {/* Description */}
      <p className="text-sm leading-relaxed opacity-60 max-w-prose">
        {p.context}
      </p>

      {/* Tech stack badges */}
      <div className="flex flex-wrap gap-2">
        {p.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] uppercase tracking-wider font-medium
                       px-2.5 py-1 border border-[rgb(var(--line)/0.12)]
                       opacity-50 rounded-sm"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* GitHub link */}
      {githubLink ? (
        <Link
          href={githubLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 self-start text-[11px] uppercase tracking-[0.2em] font-semibold
                     border-b border-[rgb(var(--line)/0.3)] pb-0.5
                     hover:border-[rgb(var(--line))] hover:opacity-100 opacity-50
                     transition-all duration-200"
        >
          {p.links && p.links.length > 1 ? "View Repos →" : "GitHub Repo →"}
        </Link>
      ) : p.links && p.links.length > 0 ? (
        <Link
          href={p.links[0].href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 self-start text-[11px] uppercase tracking-[0.2em] font-semibold
                     border-b border-[rgb(var(--line)/0.3)] pb-0.5
                     hover:border-[rgb(var(--line))] hover:opacity-100 opacity-50
                     transition-all duration-200"
        >
          {p.links[0].label} →
        </Link>
      ) : null}
    </motion.div>
  );
}
