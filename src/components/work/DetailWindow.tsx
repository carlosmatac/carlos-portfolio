"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { BoardEvent } from "@/content/events";
import { DEFAULT_PALETTE, type CaseStudy, type ProjectPalette } from "@/content/projects";
import type { StackTool } from "@/content/stack";
import CompareSlider from "./CompareSlider";
import { DIAGRAMS } from "./diagrams";
import ProjectArt from "./ProjectArt";

export const paletteStyle = (palette: ProjectPalette = DEFAULT_PALETTE) =>
  ({ "--p1": palette[0], "--p2": palette[1], "--p3": palette[2] }) as CSSProperties;

const FOCUSABLE = 'a[href], button:not([disabled]), input, video[controls], [tabindex]:not([tabindex="-1"])';

/** A centred window over a blurred board. Tab stays inside; Escape, the close button or the backdrop close it. */
export function DetailWindow({ open, labelledBy, size = "wide", palette, onClose, children }: {
  open: boolean; labelledBy: string; size?: "wide" | "narrow"; palette?: ProjectPalette; onClose: () => void; children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null), close = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current ??= document.activeElement;
    close.current?.focus({ preventScroll: true });
    panel.current?.scrollTo?.({ top: 0 });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
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
    <div className="detail-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panel} className="detail-window" data-size={size} role="dialog" aria-modal="true" aria-labelledby={labelledBy} style={paletteStyle(palette)}>
        <button type="button" className="detail-close" ref={close} onClick={onClose} aria-label="Close details">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
        </button>
        {children}
      </section>
    </div>
  );
}

function Links({ links }: { links?: { label: string; href: string }[] }) {
  if (!links?.length) return null;
  return (
    <div className="detail-links">
      {links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <span aria-hidden="true">↗</span></a>)}
    </div>
  );
}

function Head({ meta, title, lede, titleId, children }: { meta: ReactNode; title: string; lede?: string; titleId: string; children?: ReactNode }) {
  return (
    <header className="detail-head">
      <div>
        <p className="detail-meta">{meta}</p>
        <h2 id={titleId}>{title}</h2>
        {lede && <p className="detail-lede">{lede}</p>}
      </div>
      {children}
    </header>
  );
}

export function ProjectDetail({ project, titleId }: { project: CaseStudy; titleId: string }) {
  const { showcase } = project, Diagram = showcase?.diagram ? DIAGRAMS[showcase.diagram] : null;
  const facts = [["Year", project.year], ["Role", project.role], ["Status", project.status], ["Duration", project.duration]].filter(([, value]) => value);
  return (
    <>
      <Head titleId={titleId} title={project.title} lede={project.oneLiner}
        meta={<>{project.featured && <span className="project-featured">Featured</span>}{project.year} · {project.role}</>}>
        <Links links={project.links} />
      </Head>
      <div className="detail-hero">
        <div className="detail-media" style={project.media ? { aspectRatio: `${project.media.width} / ${project.media.height}` } : undefined}>
          <ProjectArt project={project} detail />
        </div>
        <aside className="detail-aside">
          <dl>{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <p className="detail-context">{project.context}</p>
          <ul className="detail-tags" aria-label="Stack">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
        </aside>
      </div>
      {showcase?.facts && (
        <ul className="detail-facts">
          {showcase.facts.map(fact => <li key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span></li>)}
        </ul>
      )}
      {Diagram && <Diagram />}
      <div className="detail-columns">
        {([["The problem", project.problem], ["Approach", project.approach], ["Outcome", project.outcome]] as const).map(([heading, items]) => (
          <section key={heading}>
            <h3>{heading}</h3>
            <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
      {showcase?.compare && <CompareSlider compare={showcase.compare} />}
      {showcase?.gallery && (
        <div className="detail-gallery">
          {showcase.gallery.map(image => (
            <figure key={image.src} data-portrait={image.height > image.width}>
              <div className="detail-gallery-frame">
                <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 900px) 85vw, 520px" unoptimized />
              </div>
              <figcaption>{image.caption}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}

export function EventDetail({ event, project, titleId, onOpenProject }: { event: BoardEvent; project?: CaseStudy; titleId: string; onOpenProject: () => void }) {
  return (
    <>
      <Head titleId={titleId} title={event.title} lede={event.lede} meta={event.meta} />
      <div className="event-art event-art-detail">
        <Image src={event.image.src} alt={event.image.alt} width={event.image.width} height={event.image.height} unoptimized />
      </div>
      <div className="detail-columns detail-columns-two">
        <section><h3>The event</h3><p>{event.about}</p></section>
        <section><h3>My weekend</h3><p>{event.experience}</p></section>
      </div>
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
    <div className="tool-detail">
      <div className="stack-tile stack-tile-detail" data-style={tool.style}>
        <Image src={tool.icon} alt="" width={96} height={96} unoptimized />
      </div>
      <div>
        <p className="detail-meta">Stack · {tool.category}</p>
        <h2 id={titleId}>{tool.name}</h2>
        <h3>How I use it</h3>
        <p className="detail-context">{tool.use}</p>
        <Links links={[{ label: `Visit ${new URL(tool.url).hostname.replace(/^www\./, "")}`, href: tool.url }]} />
      </div>
    </div>
  );
}
