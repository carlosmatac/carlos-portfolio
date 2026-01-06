"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { CaseStudy } from "@/content/projects";
import { useTextMode } from "./TextModeProvider";

function Placeholder() {
  return (
    <div className="h-full w-full grid place-items-center bg-black/[0.03]">
      <svg width="140" height="90" viewBox="0 0 140 90" className="opacity-50">
        <rect x="8" y="10" width="124" height="70" rx="10" fill="none" stroke="currentColor" />
        <path
          d="M20 62 L52 40 L72 55 L100 32 L120 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="44" cy="30" r="4" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function ProjectCard({ p }: { p: CaseStudy }) {
  const { textMode } = useTextMode();

  // En cards mode, sí mostramos todo. En text mode, normalmente ni se usa este componente,
  // pero por si acaso lo dejamos “title only”.
  const showDetails = !textMode;

  return (
    <Link href={`/work/${p.slug}`} className="group block">
      <motion.article
        whileHover={{ y: -2 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[18px] border border-[rgba(var(--line),0.18)] bg-black/[0.02]"
      >
        {/* Inner frame (paper) */}
        <div className="m-[10px] rounded-[14px] border border-[rgba(var(--line),0.12)] bg-[rgb(var(--bg))]">
          {/* Top: thumbnail as “plate” */}
          <div className="p-4">
            <div className="rounded-[14px] border border-[rgba(var(--line),0.14)] bg-black/[0.03] p-3">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] border border-[rgba(var(--line),0.12)] bg-black/[0.02]">
                {p.thumb ? (
                  <Image
                    src={p.thumb}
                    alt={p.title}
                    fill
                    className="object-cover transition duration-300 ease-out grayscale group-hover:grayscale-0"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <Placeholder />
                )}
              </div>
            </div>
          </div>

          {/* Bottom: editorial text block */}
          <div className="px-6 pb-6">
            <h3 className="font-[var(--font-serif)] uppercase tracking-[-0.015em] leading-[1.02] text-[22px] md:text-[24px]
                group-hover:underline underline-offset-4 decoration-[rgba(var(--line),0.35)]">
              {p.title}
            </h3>

            {showDetails && (
              <p className="mt-2 text-sm text-[rgb(var(--muted))] leading-relaxed max-w-[34ch]">
                {p.oneLiner}
              </p>
            )}

            {showDetails && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex flex-wrap gap-2">
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

                {/* Accent dot */}
                <span className="ml-auto h-[7px] w-[7px] rounded-full bg-[rgb(var(--accent))]" />
              </div>
            )}
          </div>
        </div>

        {/* Hover treatment: subtle (underline + border strength) */}
        <div className="pointer-events-none absolute inset-0 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </motion.article>
    </Link>
  );
}
