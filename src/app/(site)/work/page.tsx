import Container from "@/components/Container";
import ProjectGrid from "@/components/ProjectGrid";
import ProjectPanel from "@/components/ProjectPanel";
import { projects } from "@/content/projects";
import { site } from "@/content/site";

export default function WorkPage() {
  return (
    <Container>
      <section className="py-14 md:py-16">
        <div className="text-center">
          <h1 className="font-[var(--font-serif)] text-[clamp(2.6rem,6vw,4.2rem)] leading-[0.92] tracking-[-0.02em]">
            Work
          </h1>

          <p className="mt-4 text-sm md:text-base uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
            Selected projects · case studies · experiments
          </p>

          <p className="mt-4 mx-auto max-w-2xl text-sm text-[rgb(var(--muted))] leading-relaxed">
            A curated set of projects that reflect how I build: clean architecture, careful UI, and
            pragmatic engineering. Toggle <span className="uppercase tracking-[0.18em]">Text mode</span> in the header
            to switch between “index view” and “cards view”.
          </p>
        </div>
      </section>

      <section className="pb-16">
        <ProjectPanel>
          <ProjectGrid projects={projects} />
        </ProjectPanel>

        <div className="mx-auto mt-10 max-w-5xl grid gap-6 md:grid-cols-3">
          <div className="rounded-[18px] border border-[rgba(var(--line),0.14)] bg-black/[0.02] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
              Focus
            </div>
            <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--muted))] leading-relaxed">
              <li>• Systems thinking & reliability</li>
              <li>• UX polish with minimal UI</li>
              <li>• Data architecture foundations</li>
            </ul>
          </div>

          <div className="rounded-[18px] border border-[rgba(var(--line),0.14)] bg-black/[0.02] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
              Tooling
            </div>
            <ul className="mt-4 space-y-2 text-sm text-[rgb(var(--muted))] leading-relaxed">
              <li>• Next.js / Tailwind / Motion</li>
              <li>• Python / SQL / Cloud</li>
              <li>• C++ (when it matters)</li>
            </ul>
          </div>

          <div className="rounded-[18px] border border-[rgba(var(--line),0.14)] bg-black/[0.02] p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
              Resume
            </div>
            <p className="mt-4 text-sm text-[rgb(var(--muted))] leading-relaxed">
              Want the full timeline and details?
            </p>
            <a
              href={site.resumeUrl}
              download
              className="mt-4 inline-flex items-center rounded-md border border-[rgba(var(--line),0.22)]
                         px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-black/5 transition"
            >
              Download CV
            </a>
          </div>
        </div>
      </section>
    </Container>
  );
}
