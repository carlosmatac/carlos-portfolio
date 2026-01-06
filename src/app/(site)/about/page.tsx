import Container from "@/components/Container";
import { site } from "@/content/site";

export default function AboutPage() {
  return (
    <Container>
      <section className="py-14 md:py-16">
        <div className="text-center">
          <h1 className="font-[var(--font-serif)] text-[clamp(2.6rem,6vw,4.2rem)] leading-[0.92] tracking-[-0.02em]">
            About
          </h1>
          <p className="mt-4 text-sm md:text-base uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
            {site.location}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="rounded-[18px] border border-[rgba(var(--line),0.14)] bg-black/[0.02] p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Snapshot
              </div>

              <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--muted))] leading-relaxed">
                <li>• Background in software engineering</li>
                <li>• Moving into data architecture</li>
                <li>• Interested in performance, systems, and clean UI</li>
                <li>• I like building things end-to-end</li>
              </ul>
            </div>

            <div className="mt-6 rounded-[18px] border border-[rgba(var(--line),0.14)] bg-black/[0.02] p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Principles
              </div>
              <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--muted))] leading-relaxed">
                <li>• Clarity & simplicity</li>
                <li>• Measurable outcomes</li>
                <li>• Documentation that survives</li>
              </ul>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="rounded-[18px] border border-[rgba(var(--line),0.14)] bg-[rgb(var(--bg))] p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                Story
              </div>

              <div className="mt-4 space-y-4 text-sm text-[rgb(var(--muted))] leading-relaxed">
                <p>
                  I’m a software engineer transitioning into data architecture. I enjoy building systems
                  that are reliable, understandable, and pleasantly designed.
                </p>
                <p>
                  This site is a personal workspace: a curated list of projects, experiments, and case
                  studies. The goal is not “more stuff”, but better signal.
                </p>
                <p>
                  If you’re curious about collaboration, opportunities, or just want to chat — head to
                  the Contact page.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[18px] border border-[rgba(var(--line),0.14)] bg-black/[0.02] p-6">
              <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
                What I’m optimizing for
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[rgb(var(--muted))] leading-relaxed">
                <div>• System design & architecture</div>
                <div>• Data platforms & modeling</div>
                <div>• Performance & reliability</div>
                <div>• Product-quality UX</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Container>
  );
}
