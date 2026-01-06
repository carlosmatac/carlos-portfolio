import Container from "@/components/Container";
import ProjectGrid from "@/components/ProjectGrid";
import { projects } from "@/content/projects";
import ProjectPanel from "@/components/ProjectPanel";

import Link from "next/link";

export default function HomePage() {
  return (
    <Container>
      <section className="py-14 md:py-16 text-center">
        <h1 className="font-[var(--font-serif)] font-black text-[clamp(3.2rem,9vw,6.8rem)] leading-[0.9] tracking-[-0.02em]">
          CARLOS MATA
        </h1>

        <div className="mt-4 text-sm md:text-base uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
          SOFTWARE ENGINEER
        </div>
        <div className="mt-2 text-sm md:text-base uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
          C++ / ROS2 / QT · DATA PLATFORMS · MADRID
        </div>

        <div className="mt-7 flex justify-center gap-3">
          <Link
            href="/work"
            className="px-4 py-2 text-xs uppercase tracking-[0.18em]
                       border border-[rgba(var(--line),0.18)] rounded-md
                       hover:bg-black/5 transition"
          >
            View Work
          </Link>
          <a
            href="/CarlosMata-Resume.pdf"
            download
            className="px-4 py-2 text-xs uppercase tracking-[0.18em]
                       border border-[rgba(var(--line),0.18)] rounded-md
                       hover:bg-black/5 transition"
          >
            Download CV
          </a>
        </div>
      </section>


      {/* PANEL de proyectos (como en la referencia) */}
      <section className="pb-16">
        <ProjectPanel>
          <ProjectGrid projects={projects} />
        </ProjectPanel>


      </section>

    </Container>
  
  );
}
