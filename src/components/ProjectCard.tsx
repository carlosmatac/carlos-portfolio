"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Project } from "../content/projects"

export default function ProjectCard({ p }: { p: Project }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Link
        href={`/work/${p.slug}`}
        className="group block rounded-2xl border border-black/10 bg-white/40 p-5 hover:bg-white/60 transition"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
          <span className="text-xs text-[rgb(var(--muted))]">{p.year}</span>
        </div>

        <p className="mt-2 text-sm text-[rgb(var(--muted))]">{p.oneLiner}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {p.tags.map((t) => (
            <span
              key={t}
              className="text-xs rounded-full border border-black/10 px-2 py-1 text-[rgb(var(--muted))] group-hover:text-[rgb(var(--fg))] transition"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 text-sm text-[rgb(var(--accent))] opacity-0 group-hover:opacity-100 transition">
          View case →
        </div>
      </Link>
    </motion.div>
  );
}
