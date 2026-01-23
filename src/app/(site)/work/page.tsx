import Container from "@/components/Container";
import ProjectGrid from "@/components/ProjectGrid";
import { projects } from "@/content/projects";
import { site } from "@/content/site";

export default function WorkPage() {
  return (
    <Container>
      <section className="py-20 md:py-32">
        {/* Editorial Header - Consistent with About */}
        <div className="border-b-[1px] border-solid border-black dark:border-white pb-10 mb-16 md:mb-24">
          <h1 className="font-serif text-6xl md:text-8xl font-medium tracking-tight mb-6">
            Work
          </h1>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-sm uppercase tracking-[0.15em] font-medium opacity-70">
            <span>Selected Projects</span>
            <span>Case Studies · Experiments</span>
          </div>
        </div>

        {/* Intro Narrative */}
        <div className="grid md:grid-cols-12 gap-12 mb-32 md:mb-40">
          <div className="md:col-span-8 md:col-start-5 text-xl md:text-2xl leading-relaxed font-serif text-black/80 dark:text-white/80">
            <p>
              A curated set of projects that reflect how I build: <span className="italic">clean architecture</span>, <span className="italic">careful UI</span>, and <span className="font-bold">pragmatic engineering</span>.
            </p>
          </div>
        </div>

        {/* Projects Grid - Removed Panel Wrapper for open layout */}
        <div className="mb-40 md:mb-52">
          <ProjectGrid projects={projects} />
        </div>



      </section>
    </Container>
  );
}
