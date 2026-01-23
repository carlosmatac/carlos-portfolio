import Container from "@/components/Container";
import { site } from "@/content/site";

export default function AboutPage() {
  return (
    <Container>
      <section className="py-20 md:py-32">
        {/* Editorial Header */}
        <div className="border-b-[1px] border-solid border-black dark:border-white pb-10 mb-16 md:mb-24">
          <h1 className="font-serif text-6xl md:text-8xl font-medium tracking-tight mb-6">
            About
          </h1>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-sm uppercase tracking-[0.15em] font-medium opacity-70">
            <span>{site.location}</span>
            <span>Software · Data · Systems</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-24">
          {/* Left Column: Quick Signal */}
          <div className="md:col-span-4 space-y-16">

            {/* Snapshot */}
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">Snapshot</h3>
              <ul className="space-y-4 text-sm font-medium leading-relaxed opacity-80">
                <li className="flex items-start gap-3">
                  <span className="opacity-30">•</span> Background in software engineering
                </li>
                <li className="flex items-start gap-3">
                  <span className="opacity-30">•</span> Moving into data architecture
                </li>
                <li className="flex items-start gap-3">
                  <span className="opacity-30">•</span> Performance, systems, clean UI
                </li>
              </ul>
            </div>

            {/* Principles */}
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">Principles</h3>
              <ul className="space-y-4 text-sm font-medium leading-relaxed opacity-80">
                <li className="flex items-start gap-3">
                  <span className="opacity-30">•</span> Clarity & simplicity
                </li>
                <li className="flex items-start gap-3">
                  <span className="opacity-30">•</span> Measurable outcomes
                </li>
                <li className="flex items-start gap-3">
                  <span className="opacity-30">•</span> Documentation that survives
                </li>
              </ul>
            </div>

          </div>

          {/* Right Column: Narrative */}
          <div className="md:col-span-8">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-40">The Narrative</h3>

            <div className="space-y-8 text-xl md:text-2xl leading-relaxed font-serif text-black/80 dark:text-white/80">
              <p>
                I’m a software engineer transitioning into data architecture. I enjoy building systems
                that are <span className="italic">reliable</span>, <span className="italic">understandable</span>, and pleasantly designed.
              </p>
              <p>
                This site is a personal workspace: a curated list of projects, experiments, and case
                studies. The goal is not "more stuff", but <span className="font-bold">better signal</span>.
              </p>
            </div>

            <div className="mt-16 pt-16 border-t border-black/10 dark:border-white/10">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-40">Optimizing For</h3>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 text-base font-medium opacity-80">
                <div className="flex justify-between border-b border-black/10 dark:border-white/10 pb-2">
                  <span>System Design</span>
                  <span className="opacity-30">01</span>
                </div>
                <div className="flex justify-between border-b border-black/10 dark:border-white/10 pb-2">
                  <span>Data Platforms</span>
                  <span className="opacity-30">02</span>
                </div>
                <div className="flex justify-between border-b border-black/10 dark:border-white/10 pb-2">
                  <span>Performance</span>
                  <span className="opacity-30">03</span>
                </div>
                <div className="flex justify-between border-b border-black/10 dark:border-white/10 pb-2">
                  <span>Product UX</span>
                  <span className="opacity-30">04</span>
                </div>
              </div>
            </div>

            <div className="mt-16">
              <a href="/contact" className="inline-block border-b border-black dark:border-white pb-1 hover:opacity-50 transition-opacity uppercase tracking-widest text-sm font-bold">
                Let's Collaborate →
              </a>
            </div>

          </div>
        </div>
      </section>
    </Container>
  );
}
