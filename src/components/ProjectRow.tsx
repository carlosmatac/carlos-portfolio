"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Project } from "@/content/projects";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function ProjectRow({ p, index }: { p: Project; index: number }) {
  return (
    <Link href={`/work#${p.slug}`} className="block">
      <motion.div
        whileHover={{ x: 6 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="py-5 md:py-6"
      >
        <div className="grid grid-cols-12 items-baseline gap-4">
          <div className="col-span-2 md:col-span-1 text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
            {pad2(index)}
          </div>

          <div className="col-span-10 md:col-span-6">
            <div className="font-[var(--font-serif)] text-xl md:text-2xl uppercase tracking-[-0.01em]">
              {p.title}
            </div>
            <div className="mt-1 text-sm text-[rgb(var(--muted))] max-w-[52ch]">
              {p.oneLiner}
            </div>
          </div>

          <div className="hidden md:block md:col-span-4">
            <div className="flex flex-wrap gap-2 justify-end">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-1 rounded-full border border-[rgba(var(--line),0.16)]
                           text-[rgb(var(--muted))] uppercase tracking-[0.14em]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden md:block md:col-span-1 justify-self-end">
            <span className="h-[7px] w-[7px] rounded-full bg-[rgb(var(--accent))] inline-block" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
