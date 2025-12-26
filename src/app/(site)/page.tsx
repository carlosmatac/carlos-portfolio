import Header from "@/components/Header";
import Container from "@/components/Container";
import { Page, Reveal } from "@/components/Motion";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Header />
      <Page>
        <Container>
          <section className="py-16 md:py-24">
            <Reveal>
              <h1 className="text-5xl md:text-7xl font-semibold tracking-tight">
                Carlos Mata
              </h1>
              <p className="mt-6 text-lg md:text-xl text-[rgb(var(--muted))] max-w-2xl">
                Software Engineer → Data Architect<br />
                C++/ROS 2/Qt · Data Platforms · Madrid
              </p>

              <div className="mt-10 flex items-center gap-4">
                <Link
                  href="/work"
                  className="rounded-full bg-[rgb(var(--fg))] text-[rgb(var(--bg))] px-5 py-2 text-sm hover:opacity-90 transition"
                >
                  View Work
                </Link>
                <a
                  href="/cv.pdf"
                  className="rounded-full border border-black/15 px-5 py-2 text-sm hover:border-black/30 transition"
                >
                  Download CV
                </a>
              </div>
            </Reveal>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {[
                { k: "01", t: "Systems", d: "Real-world engineering with performance and reliability focus." },
                { k: "02", t: "Product", d: "Full-stack builds with UX polish and clean structure." },
                { k: "03", t: "Data", d: "Moving into data architecture with modern platform tooling." },
              ].map((x, i) => (
                <Reveal key={x.k} delay={i * 0.06}>
                  <div className="rounded-2xl border border-black/10 bg-white/40 p-6">
                    <div className="text-xs text-[rgb(var(--muted))]">{x.k}</div>
                    <div className="mt-3 text-base font-semibold">{x.t}</div>
                    <div className="mt-2 text-sm text-[rgb(var(--muted))]">{x.d}</div>
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
