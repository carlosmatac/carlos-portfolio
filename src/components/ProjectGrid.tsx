import type { Project } from "@/content/projects";
import ProjectCard from "./ProjectCard";

export default function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.slug} p={p} />
      ))}
    </div>
  );
}
