import Container from "@/components/Container";
import { projects } from "@/content/projects";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return {
      title: "Case Study Not Found",
    };
  }

  return {
    title: `${project.title} | Carlos Mata`,
    description: project.oneLiner,
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <Container>
      {/* Back link */}
      <div className="pt-8 pb-4">
        <Link
          href="/work"
          className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition inline-flex items-center gap-2"
        >
          ← Back to Work
        </Link>
      </div>

      {/* Header */}
      <section className="py-8 md:py-12">
        <div className="max-w-4xl">
          <h1 className="font-[var(--font-serif)] text-[clamp(2.8rem,6vw,4.5rem)] leading-[0.92] tracking-[-0.02em] uppercase">
            {project.title}
          </h1>

          <p className="mt-4 text-lg md:text-xl text-[rgb(var(--muted))] leading-relaxed">
            {project.oneLiner}
          </p>

          {/* Metadata */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[rgb(var(--muted))]">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.18em] text-xs">Year</span>
              <span>{project.year}</span>
            </div>
            <span className="opacity-30">/</span>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-[0.18em] text-xs">Role</span>
              <span>{project.role}</span>
            </div>
            {project.status && (
              <>
                <span className="opacity-30">/</span>
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-[0.18em] text-xs">Status</span>
                  <span>{project.status}</span>
                </div>
              </>
            )}
            {project.duration && (
              <>
                <span className="opacity-30">/</span>
                <div className="flex items-center gap-2">
                  <span className="uppercase tracking-[0.18em] text-xs">Duration</span>
                  <span>{project.duration}</span>
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          <div className="mt-6 flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-3 py-1.5 rounded-full border border-[rgba(var(--line),0.16)]
                         text-[rgb(var(--muted))] uppercase tracking-[0.14em]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Thumbnail */}
      {project.thumb && (
        <section className="py-8">
          <div className="max-w-5xl">
            <div className="relative aspect-[16/10] rounded-[18px] border border-[rgba(var(--line),0.14)] overflow-hidden bg-black/[0.02]">
              <Image
                src={project.thumb}
                alt={project.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-8 md:py-12">
        <div className="max-w-3xl space-y-12">
          {/* Context */}
          <div>
            <h2 className="font-[var(--font-serif)] text-2xl md:text-3xl tracking-[-0.01em] uppercase mb-4">
              Context
            </h2>
            <p className="text-[rgb(var(--muted))] leading-relaxed text-base md:text-lg">
              {project.context}
            </p>
          </div>

          {/* Problem */}
          <div>
            <h2 className="font-[var(--font-serif)] text-2xl md:text-3xl tracking-[-0.01em] uppercase mb-4">
              Problem
            </h2>
            <ul className="space-y-3 text-[rgb(var(--muted))] leading-relaxed">
              {project.problem.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-[rgb(var(--fg))] mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Approach */}
          <div>
            <h2 className="font-[var(--font-serif)] text-2xl md:text-3xl tracking-[-0.01em] uppercase mb-4">
              Approach
            </h2>
            <ul className="space-y-3 text-[rgb(var(--muted))] leading-relaxed">
              {project.approach.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-[rgb(var(--fg))] mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Outcome */}
          <div>
            <h2 className="font-[var(--font-serif)] text-2xl md:text-3xl tracking-[-0.01em] uppercase mb-4">
              Outcome
            </h2>
            <ul className="space-y-3 text-[rgb(var(--muted))] leading-relaxed">
              {project.outcome.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-[rgb(var(--fg))] mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Highlights */}
          {project.highlights && project.highlights.length > 0 && (
            <div>
              <h2 className="font-[var(--font-serif)] text-2xl md:text-3xl tracking-[-0.01em] uppercase mb-4">
                Highlights
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.highlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 rounded-md border border-[rgba(var(--line),0.18)] 
                             text-sm text-[rgb(var(--muted))] uppercase tracking-[0.12em]"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {project.links && project.links.length > 0 && (
            <div>
              <h2 className="font-[var(--font-serif)] text-2xl md:text-3xl tracking-[-0.01em] uppercase mb-4">
                Links
              </h2>
              <div className="flex flex-wrap gap-3">
                {project.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    className="px-4 py-2 text-xs uppercase tracking-[0.18em]
                             border border-[rgba(var(--line),0.18)] rounded-md
                             hover:bg-black/5 transition"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Gallery */}
      {project.gallery && project.gallery.length > 0 && (
        <section className="py-8 md:py-12">
          <div className="max-w-5xl">
            <h2 className="font-[var(--font-serif)] text-2xl md:text-3xl tracking-[-0.01em] uppercase mb-6">
              Gallery
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {project.gallery.map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-[16/10] rounded-[14px] border border-[rgba(var(--line),0.14)] overflow-hidden bg-black/[0.02]"
                >
                  <Image
                    src={img}
                    alt={`${project.title} - Image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer navigation */}
      <section className="py-12 border-t border-[rgba(var(--line),0.14)]">
        <div className="max-w-4xl">
          <Link
            href="/work"
            className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition inline-flex items-center gap-2"
          >
            ← Back to Work
          </Link>
        </div>
      </section>
    </Container>
  );
}
