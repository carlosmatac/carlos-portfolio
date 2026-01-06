"use client";

import type { CaseStudy } from "@/content/projects";
import ProjectCard from "./ProjectCard";
import ProjectRow from "./ProjectRow";
import { useTextMode } from "./TextModeProvider";

export default function ProjectGrid({ projects }: { projects: CaseStudy[] }) {
  const { textMode } = useTextMode();

  if (textMode) {
    return (
      <div className="divide-y divide-[rgba(var(--line),0.10)]">
        {projects.map((p, idx) => (
          <ProjectRow key={p.slug} p={p} index={idx + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.slug} p={p} />
      ))}
    </div>
  );
}
