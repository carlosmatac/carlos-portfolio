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

  if (textMode) {
    return (
      <Link href={`/work/${p.slug}`} className="block py-4 border-b border-black/[0.1] dark:border-white/[0.1] group">
        <div className="flex justify-between items-baseline">
          <h3 className="font-serif text-xl uppercase tracking-wider group-hover:underline">{p.title}</h3>
          <span className="text-xs uppercase tracking-widest text-gray-500">{p.tags[0]}</span>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">{p.oneLiner}</p>
      </Link>
    );
  }

  return (
    <Link href={`/work/${p.slug}`} className="group block mb-12">
      {/* Image container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-900 mb-6">
        {p.thumb ? (
          <Image
            src={p.thumb}
            alt={p.title}
            fill
            className="object-cover transition duration-700 ease-out grayscale group-hover:grayscale-0 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <Placeholder />
        )}
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-2">
        <h3 className="font-serif text-3xl md:text-4xl uppercase leading-none tracking-tight group-hover:underline decoration-1 underline-offset-4">
          {p.title}
        </h3>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-[90%]">
          {p.oneLiner}
        </p>

        <div className="flex flex-wrap gap-2 mt-2">
          {p.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] uppercase tracking-widest px-2 py-1 border border-black/[0.1] dark:border-white/[0.2] text-gray-500"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
