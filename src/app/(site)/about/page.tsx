import Container from "@/components/Container";
import Timeline from "@/components/Timeline";
import { site } from "@/content/site";
import { timeline } from "@/content/timeline";
import { certifications } from "@/content/certifications";

export default function AboutPage() {
  return (
    <Container>
      <section className="py-20 md:py-32">
        {/* Editorial Header */}
        <div className="border-b-[1px] border-solid border-[rgb(var(--line))] pb-10 mb-16 md:mb-24">
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

            {/* Links */}
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">Links</h3>
              <div className="space-y-4 text-sm font-medium leading-relaxed opacity-80">
                <a
                  href={site.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 hover:opacity-50 transition-opacity"
                >
                  <span className="opacity-30">•</span> GitHub ↗
                </a>
                <a
                  href={site.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 hover:opacity-50 transition-opacity"
                >
                  <span className="opacity-30">•</span> LinkedIn ↗
                </a>
                <a
                  href={`mailto:${site.email}`}
                  className="flex items-start gap-3 hover:opacity-50 transition-opacity"
                >
                  <span className="opacity-30">•</span> Email →
                </a>
              </div>
            </div>

          </div>

          {/* Right Column: Narrative */}
          <div className="md:col-span-8">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-40">The Narrative</h3>

            <div className="space-y-8 text-xl md:text-2xl leading-relaxed font-serif">
              <p>
                I’m a software engineer transitioning into data architecture. I enjoy building systems
                that are <span className="italic">reliable</span>, <span className="italic">understandable</span>, and pleasantly designed.
              </p>
              <p>
                This site is a personal workspace: a curated list of projects, experiments, and case
                studies. The goal is not "more stuff", but <span className="font-bold">better signal</span>.
              </p>
            </div>

            <div className="mt-16 pt-16 border-t border-[rgb(var(--line)/0.1)]">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-40">Optimizing For</h3>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 text-base font-medium opacity-80">
                <div className="flex justify-between border-b border-[rgb(var(--line)/0.1)] pb-2">
                  <span>System Design</span>
                  <span className="opacity-30">01</span>
                </div>
                <div className="flex justify-between border-b border-[rgb(var(--line)/0.1)] pb-2">
                  <span>Data Platforms</span>
                  <span className="opacity-30">02</span>
                </div>
                <div className="flex justify-between border-b border-[rgb(var(--line)/0.1)] pb-2">
                  <span>Performance</span>
                  <span className="opacity-30">03</span>
                </div>
                <div className="flex justify-between border-b border-[rgb(var(--line)/0.1)] pb-2">
                  <span>Product UX</span>
                  <span className="opacity-30">04</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[rgb(var(--line)/0.2)] my-16 md:my-24"></div>

        {/* Timeline Section */}
        <div className="mb-16 md:mb-24">
          <h2 className="font-serif text-2xl md:text-3xl font-medium mb-10 md:mb-16 text-center">Timeline</h2>
          <Timeline items={timeline} />
        </div>

        {/* Divider */}
        <div className="border-t border-[rgb(var(--line)/0.2)] my-16 md:my-24"></div>

        {/* Certifications Section */}
        <div className="mb-16 md:mb-24">
          <h2 className="font-serif text-2xl md:text-3xl font-medium mb-10 md:mb-12">Certifications</h2>
          <div className="space-y-6">
            {certifications.map((cert, index) => (
              <div
                key={index}
                className="pb-6 border-b border-[rgb(var(--line)/0.1)] last:border-b-0"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-base font-medium">{cert.name}</span>
                  <span className="text-sm opacity-60">{cert.year}</span>
                </div>
                <div className="text-sm opacity-60">{cert.issuer}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a href="/contact" className="inline-block border-b border-[rgb(var(--line))] pb-1 hover:opacity-50 transition-opacity uppercase tracking-widest text-sm font-bold">
            Let's Collaborate →
          </a>
        </div>

      </section>
    </Container>
  );
}
