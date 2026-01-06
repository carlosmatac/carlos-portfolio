"use client";

import Link from "next/link";
import type { CaseStudy } from "@/content/projects";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function ProjectRow({ p, index }: { p: CaseStudy; index: number }) {
  return (
    <Link href={`/work#${p.slug}`} className="group block">
      <div className="py-5 md:py-6 transition-transform duration-200 ease-out group-hover:translate-x-[2px]">
        <div className="grid grid-cols-12 items-baseline gap-4">
          <div className="col-span-2 md:col-span-1 text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
            {pad2(index)}
          </div>

          <div className="col-span-10 md:col-span-6">
            <div className="font-[var(--font-serif)] text-xl md:text-2xl uppercase tracking-[-0.01em] inline-block">
              <span className="relative inline-block">
                {p.title}
                <span className="absolute bottom-[-1px] left-0 w-0 h-[0.5px] bg-current transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:w-full" />
              </span>
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
      </div>
    </Link>
  );
}
