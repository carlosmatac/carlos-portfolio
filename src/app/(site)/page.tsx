import Container from "@/components/Container";
import ProjectGrid from "@/components/ProjectGrid";
import { projects } from "@/content/projects";
import ProjectPanel from "@/components/ProjectPanel";

import Link from "next/link";

export default function HomePage() {
  return (
    <Container>
      <section className="pt-24 pb-20 md:pt-32 md:pb-32 text-center md:text-left">
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
            href="/work"
            className="px-6 py-3 text-[10px] md:text-xs uppercase tracking-[0.2em] bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors rounded-sm font-semibold"
          >
            View Work
          </Link>
          <a
            href="/CarlosMata-Resume.pdf"
            download
            className="px-6 py-3 text-[10px] md:text-xs uppercase tracking-[0.2em] border border-gray-200 dark:border-gray-800 hover:border-black dark:hover:border-white transition-colors rounded-sm font-semibold"
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
