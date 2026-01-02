"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Project } from "@/content/projects";
import { useTextMode } from "./TextModeProvider";

function Placeholder() {
  return (
    <div className="h-full w-full bg-black/5 grid place-items-center">
      <svg width="140" height="90" viewBox="0 0 140 90" className="opacity-50">
        <rect x="8" y="10" width="124" height="70" rx="10" fill="none" stroke="currentColor" />
        <path d="M20 62 L52 40 L72 55 L100 32 L120 48" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="44" cy="30" r="4" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function ProjectCard({ p }: { p: Project }) {
  const { textMode } = useTextMode();

  return (
    <Link href={`/work#${p.slug}`} className="group block">
      <motion.article
        whileHover={{ y: -2 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[14px] border border-[rgba(var(--line),0.16)] bg-[rgb(var(--bg))] overflow-hidden
                  group-hover:border-[rgba(var(--line),0.28)]"
      >

        {/* Thumbnail */}
        <div className="p-4">
          <div className="relative aspect-[16/10] rounded-[12px] border border-[rgba(var(--line),0.14)] overflow-hidden bg-black/5">
            {p.thumb ? (
              <Image
                src={p.thumb}
                alt={p.title}
                fill
                className="object-cover grayscale"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <Placeholder />
            )}
          </div>
        </div>


        {/* Text */}
        <div className="px-5 pb-5">
          <h3 className="font-[var(--font-serif)] text-[22px] leading-[1.05] tracking-[-0.01em] uppercase">
            {p.title}
          </h3>

          {!textMode && (
            <p className="mt-3 text-sm text-[rgb(var(--muted))] leading-relaxed max-w-[28ch]">
              {p.oneLiner}
            </p>
          )}

          {!textMode && (
            <div className="mt-5 flex flex-wrap gap-2 items-center">
              {p.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-1 rounded-full border border-[rgba(var(--line),0.16)]
                          text-[rgb(var(--muted))] uppercase tracking-[0.14em]"
                >
                  {t}
                </span>
              ))}
              <span className="ml-auto h-[7px] w-[7px] rounded-full bg-[rgb(var(--accent))]" />
            </div>
          )}
        </div>

      </motion.article>
    </Link>
  );
}
