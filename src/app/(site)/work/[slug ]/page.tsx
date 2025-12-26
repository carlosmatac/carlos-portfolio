import Header from "@/components/Header";
import Container from "@/components/Container";
import { Page, Reveal } from "@/components/Motion";
import { projects } from "@/content/projects";
import { notFound } from "next/navigation";

export default function CaseStudyPage({ params }: { params: { slug: string } }) {
  const p = projects.find((x) => x.slug === params.slug);
  if (!p) return notFound();

  return (
    <>
      <Header />
      <Page>
        <Container>
          <section className="py-14 md:py-20">
            <Reveal>
              <div className="text-sm text-[rgb(var(--muted))]">{p.year}</div>
              <h1 className="mt-3 text-4xl md:text-6xl font-semibold tracking-tight">{p.title}</h1>
              <p className="mt-5 text-lg text-[rgb(var(--muted))] max-w-2xl">{p.oneLiner}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span key={t} className="text-xs rounded-full border border-black/10 px-2 py-1 text-[rgb(var(--muted))]">
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>

            <div className="mt-12 grid gap-10 md:grid-cols-2">
              {p.sections.map((s, idx) => (
                <Reveal key={s.heading} delay={idx * 0.06}>
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-[rgb(var(--muted))]">
                      {s.heading}
                    </h2>
                    <ul className="mt-4 space-y-2 text-sm leading-relaxed">
                      {s.content.map((c) => (
                        <li key={c} className="text-[rgb(var(--fg))]">• {c}</li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        </Container>
      </Page>
    </>
  );
}
