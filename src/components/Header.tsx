"use client";

import { useEffect, useState } from "react";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { site } from "@/content/site";

const SECTION_IDS = ["hero", "about", "work"];
const NAV = [
  { id: "about", label: "About" },
  { id: "work", label: "Work" },
];

/**
 * Cabecera fija. No existe en el hero: aparece al pasar la primera pantalla y
 * marca en acento la sección en la que estás.
 */
export default function Header() {
  const activeSection = useActiveSection(SECTION_IDS);
  const { scrollToSection, scrollToTop } = useSmoothScroll();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-[rgb(var(--line)/0.10)] bg-[rgb(var(--bg)/0.88)] backdrop-blur-md transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
      style={{ height: "var(--header-h)" }}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6 md:px-16">
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            scrollToTop();
          }}
          className="text-sm font-semibold tracking-[-0.01em] transition-colors hover:text-[rgb(var(--accent))]"
        >
          {site.name}
        </a>

        <nav aria-label="Sections" className="flex gap-2 md:gap-2.5">
          {NAV.map(({ id, label }) => {
            const isActive = activeSection === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-current={isActive ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(id);
                }}
                className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[rgb(var(--accent))] text-[rgb(var(--bg))]"
                    : "border border-[rgb(var(--line)/0.20)] hover:border-[rgb(var(--line)/0.45)]"
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>
      </div>

      <div aria-live="polite" className="sr-only">
        {activeSection && `Navigated to ${activeSection} section`}
      </div>
    </header>
  );
}
