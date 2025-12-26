import Header from "@/components/Header";
import Container from "@/components/Container";
import { Page, Reveal } from "@/components/Motion";
import ProjectCard from "@/components/ProjectCard";
import { projects } from "@/content/projects";

export default function WorkPage() {
  return (
    <>
      <Header />
      <Page>
        <Container>
          <section className="py-14 md:py-20">
            <Reveal>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">Work</h1>
              <p className="mt-4 text-[rgb(var(--muted))] max-w-2xl">
                Selected projects and case studies. Clean, concise, and focused on outcomes.
              </p>
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {projects.map((p, i) => (
                <Reveal key={p.slug} delay={i * 0.05}>
                  <ProjectCard p={p} />
                </Reveal>
              ))}
            </div>
          </section>
        </Container>
      </Page>
    </>
  );
}
