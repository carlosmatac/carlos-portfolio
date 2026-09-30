"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import type { BoardEvent } from "@/content/events";
import type { CaseStudy } from "@/content/projects";
import type { StackTool } from "@/content/stack";
import ProjectArt from "./ProjectArt";

/** Non-modal detail panel: the board stays explorable behind it. */
export function Drawer({ open, labelledBy, onClose, children }: { open: boolean; labelledBy: string; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current ??= document.activeElement;
    close.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, labelledBy, onClose]);

  useEffect(() => {
    if (open || !opener.current) return;
    (opener.current as HTMLElement).focus?.({ preventScroll: true });
    opener.current = null;
  }, [open]);

  if (!open) return null;
  return (
    <aside className="project-drawer" role="dialog" aria-modal="false" aria-labelledby={labelledBy}>
      <button type="button" className="project-drawer-close" ref={close} onClick={onClose} aria-label="Close details">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
      </button>
      {children}
    </aside>
  );
}

function Links({ links }: { links?: { label: string; href: string }[] }) {
  if (!links?.length) return null;
  return (
    <div className="project-drawer-links">
      {links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <span aria-hidden="true">↗</span></a>)}
    </div>
  );
}

export function ProjectDetail({ project, titleId }: { project: CaseStudy; titleId: string }) {
  return (
    <>
      <p className="project-drawer-meta">{project.featured && <span className="project-featured">Featured</span>}{[project.year, project.role, project.status].filter(Boolean).join(" · ")}</p>
      <h2 id={titleId}>{project.title}</h2>
      <p className="project-drawer-lede">{project.oneLiner}</p>
      <div className="project-drawer-art" style={project.media ? { aspectRatio: `${project.media.width} / ${project.media.height}` } : undefined}>
        <ProjectArt project={project} detail />
      </div>
      <p className="project-drawer-context">{project.context}</p>
      <h3>Approach</h3>
      <ul>{project.approach.map(item => <li key={item}>{item}</li>)}</ul>
      <h3>Outcome</h3>
      <ul>{project.outcome.map(item => <li key={item}>{item}</li>)}</ul>
      <ul className="project-drawer-tags" aria-label="Stack">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
      <Links links={project.links} />
    </>
  );
}

export function EventDetail({ event, project, titleId, onOpenProject }: { event: BoardEvent; project?: CaseStudy; titleId: string; onOpenProject: () => void }) {
  return (
    <>
      <p className="project-drawer-meta">{event.meta}</p>
      <h2 id={titleId}>{event.title}</h2>
      <p className="project-drawer-lede">{event.lede}</p>
      <div className="event-art event-art-detail">
        <Image src={event.image.src} alt={event.image.alt} width={event.image.width} height={event.image.height} unoptimized />
      </div>
      <p className="project-drawer-context">{event.about}</p>
      <h3>My weekend</h3>
      <p className="project-drawer-context project-drawer-tight">{event.experience}</p>
      {project && (
        <button type="button" className="event-project" onClick={onOpenProject}>
          <span>Built there</span>{project.title} <span aria-hidden="true">→</span>
        </button>
      )}
      <Links links={event.links} />
    </>
  );
}

export function ToolDetail({ tool, titleId }: { tool: StackTool; titleId: string }) {
  return (
    <>
      <div className="stack-tile stack-tile-detail" data-style={tool.style}>
        <Image src={tool.icon} alt="" width={96} height={96} unoptimized />
      </div>
      <p className="project-drawer-meta">Stack · {tool.category}</p>
      <h2 id={titleId}>{tool.name}</h2>
      <h3>How I use it</h3>
      <p className="project-drawer-context project-drawer-tight">{tool.use}</p>
      <Links links={[{ label: `Visit ${new URL(tool.url).hostname.replace(/^www\./, "")}`, href: tool.url }]} />
    </>
  );
}
