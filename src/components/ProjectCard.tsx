"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Project } from "@/content/projects";
import { useTextMode } from "./TextModeProvider";

export default function ProjectCard({ p }: { p: Project }) {
  const { textMode } = useTextMode();

  return (
    <Link href={`/work#${p.slug}`} className="group block">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-xl border border-[rgba(var(--line),0.14)] bg-white/25 overflow-hidden"
      >
        <div className="aspect-[16/10] bg-black/5 relative">
          <Image src={p.thumb} alt={p.title} fill className="object-cover grayscale" />
        </div>

        <div className="p-5">
          <div className="font-[var(--font-serif)] text-2xl tracking-tight leading-none">
            {p.title}
          </div>

          {!textMode && (
            <div className="mt-2 text-sm text-[rgb(var(--muted))]">
              {p.oneLiner}
            </div>
          )}

          {!textMode && (
            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="text-[11px] px-2 py-1 rounded-full border border-[rgba(var(--line),0.14)]
                             text-[rgb(var(--muted))] uppercase tracking-[0.12em]"
                >
                  {t}
                </span>
              ))}
              <span className="ml-auto inline-flex items-center gap-2 text-[11px] text-[rgb(var(--muted))] uppercase tracking-[0.12em]">
                <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}
