"use client";

import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { site } from "@/content/site";

const META =
  "text-[10px] md:text-xs font-medium uppercase tracking-[0.18em] text-[rgb(var(--fg)/0.42)]";

export default function Hero() {
  const { scrollToSection } = useSmoothScroll();

  const jump = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <section
      id="hero"
      aria-label="Intro"
      className="relative flex min-h-screen flex-col justify-between px-6 py-8 md:px-16 md:py-12"
    >
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
        <span className={META}>{site.location}</span>
        <span className={META}>Software &amp; Data Engineering</span>
      </div>

      <h1
        className="my-8 text-[23vw] uppercase leading-[0.8] tracking-[-0.05em] md:my-0 md:text-[15.4vw] md:tracking-[-0.055em]"
        style={{ fontWeight: 620 }}
      >
        Carlos
        <span className="block md:pl-[0.06em]">
          Mata
          <span className="caret" aria-hidden="true" />
        </span>
      </h1>

      <div className="flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
        <nav aria-label="Primary" className="flex flex-col gap-2.5 md:flex-row md:gap-3.5">
          <a
            href="#about"
            onClick={(e) => jump(e, "about")}
            className="group inline-flex min-h-14 items-center justify-between gap-3 rounded-full border border-[rgb(var(--line)/0.22)] px-7 text-[17px] font-medium transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))] hover:text-[rgb(var(--bg))] md:justify-start md:text-[15px]"
          >
            About
            <span className="opacity-45 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100">
              →
            </span>
          </a>
          <a
            href="#work"
            onClick={(e) => jump(e, "work")}
            className="group inline-flex min-h-14 items-center justify-between gap-3 rounded-full border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] px-7 text-[17px] font-medium text-[rgb(var(--bg))] transition-opacity hover:opacity-85 md:justify-start md:text-[15px]"
          >
            Work
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </a>
        </nav>

        <p className="max-w-[380px] text-[15px] leading-[1.5] text-[rgb(var(--fg)/0.55)] md:text-right">
          Software &amp; Data Engineer. Databricks, dbt &amp; Snowflake at work —
          Node.js, React &amp; Supabase on my own projects.
        </p>
      </div>
    </section>
  );
}
