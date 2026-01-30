"use client";

import { useEffect } from "react";
import Container from "@/components/Container";
import Section from "@/components/Section";
import ScrollHint from "@/components/ScrollHint";
import WorkPreview from "@/components/WorkPreview";
import AboutPreview from "@/components/AboutPreview";
import ContactPreview from "@/components/ContactPreview";
import Link from "next/link";

export default function HomePage() {
  // Handle hash on page load for deep linking
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, []);

  return (
    <>
      {/* SECTION 1: HERO */}
      <Section id="hero" fullHeight ariaLabel="Hero section" className="relative">
        <Container>
          <div className="pt-24 pb-20 md:pt-32 md:pb-32 text-center md:text-left">
            {/* Massive Name - Adjusted size to fit single line naturally */}
            <h1 className="font-serif font-bold text-[8vw] md:text-[8.5vw] tracking-tighter mb-6 md:mb-8 text-center">
              CARLOS MATA
            </h1>

            {/* Subtitles Grid - Inherits color from body (var(--fg)) for perfect contrast */}
            <div className="flex flex-col md:flex-row justify-center items-center md:items-start gap-4 md:gap-12 uppercase tracking-[0.15em] text-xs md:text-sm font-medium opacity-90">
              <div className="flex flex-col items-center md:items-end text-center md:text-right">
                <span>Software Engineer <span className="mx-2">→</span> Data Architect</span>
              </div>
              <div className="hidden md:block w-px h-8 bg-current opacity-40"></div>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span>C++ / ROS2 / QT · Data Platforms · Madrid</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-10 flex justify-center gap-4">
              <Link
                href="/#work"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
                  window.history.pushState({}, "", "/#work");
                }}
                className="px-6 py-3 text-[10px] md:text-xs uppercase tracking-[0.2em] border border-[rgb(var(--line)/0.2)] hover:border-[rgb(var(--line))] transition-colors rounded-sm font-semibold"
              >
                View Work
              </Link>
              <a
                href="/CarlosMata-Resume.pdf"
                download
                className="px-6 py-3 text-[10px] md:text-xs uppercase tracking-[0.2em] border border-[rgb(var(--line)/0.2)] hover:border-[rgb(var(--line))] transition-colors rounded-sm font-semibold"
              >
                Download CV
              </a>
            </div>
          </div>
        </Container>

        {/* Scroll Hint */}
        <ScrollHint />
      </Section>

      {/* SECTION 2: WORK */}
      <Section id="work" ariaLabel="Selected work section">
        <Container>
          <WorkPreview />
        </Container>
      </Section>

      {/* SECTION 3: ABOUT */}
      <Section id="about" ariaLabel="About section">
        <Container>
          <AboutPreview />
        </Container>
      </Section>

      {/* SECTION 4: CONTACT */}
      <Section id="contact" ariaLabel="Contact section">
        <Container>
          <ContactPreview />
        </Container>
      </Section>
    </>
  );
}
