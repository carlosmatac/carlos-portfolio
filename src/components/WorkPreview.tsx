"use client";

import { projects } from "@/content/projects";
import ProjectCard from "@/components/ProjectCard";

export default function WorkPreview() {
    return (
        <div className="py-20 md:py-32">
            {/* Section Header */}
            <div className="border-b border-[rgb(var(--line)/0.2)] pb-8 mb-12 md:mb-16">
                <h2 className="font-serif text-4xl md:text-6xl font-medium tracking-tight mb-4">
                    Selected Work
                </h2>
                <p className="text-sm uppercase tracking-[0.15em] font-medium opacity-60">
                    Featured Projects
                </p>
            </div>

            {/* Projects List */}
            <div className="flex flex-col">
                {projects.map((project, index) => (
                    <ProjectCard key={project.slug} p={project} index={index} />
                ))}
            </div>
        </div>
    );
}
