import { site } from "@/content/site";
import { timeline } from "@/content/timeline";
import { certifications } from "@/content/certifications";

const LABEL =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--fg)/0.35)]";
const SECTION_LABEL =
  "text-[13px] font-semibold uppercase tracking-[0.2em] text-[rgb(var(--fg)/0.45)]";

const OPTIMIZING_FOR = ["System design", "Data platforms", "Performance", "Product UX"];

export default function AboutSection() {
  return (
    <section
      id="about"
      aria-label="About"
      className="px-6 pb-24 pt-20 md:px-16 md:pb-32 md:pt-28"
    >
      <div className="border-t border-[rgb(var(--line)/0.14)] pt-4">
        <h2
          className="text-[22vw] uppercase leading-[0.82] tracking-[-0.06em] md:text-[17vw]"
          style={{ fontWeight: 620 }}
        >
          About
        </h2>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 md:mt-14 md:grid-cols-12 md:gap-7">
        <div className="md:col-span-7">
          <p className="text-[21px] font-light leading-[1.34] tracking-[-0.015em] text-[rgb(var(--fg)/0.92)] md:text-[27px] [text-wrap:pretty]">
            I&apos;m a Software &amp; Data Engineer, currently focused on{" "}
            <strong className="font-semibold text-[rgb(var(--accent))]">data architecture</strong>. I
            enjoy building systems that are reliable, understandable, and pleasantly designed.
          </p>
          <p className="mt-6 text-[21px] font-light leading-[1.34] tracking-[-0.015em] text-[rgb(var(--fg)/0.92)] md:text-[27px] [text-wrap:pretty]">
            This site is a personal workspace: a curated list of projects and experiments. The goal is
            not more stuff, but better signal.
          </p>
        </div>

        <div className="flex flex-col gap-6 md:col-start-9 md:col-end-13">
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Now</span>
            <span className="text-[15px] leading-[1.5] text-[rgb(var(--fg)/0.8)]">
              Data Architect at Nfq — {site.location}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className={LABEL}>Optimizing for</span>
            <span className="text-[15px] leading-[1.5] text-[rgb(var(--fg)/0.8)]">
              {OPTIMIZING_FOR.join(" · ")}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <span className={LABEL}>Elsewhere</span>
            <div className="flex flex-col items-start gap-1.5">
              <a
                href={site.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] text-[rgb(var(--fg)/0.8)] transition-colors hover:text-[rgb(var(--accent))]"
              >
                GitHub <span className="opacity-40">↗</span>
              </a>
              <a
                href={site.links.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] text-[rgb(var(--fg)/0.8)] transition-colors hover:text-[rgb(var(--accent))]"
              >
                LinkedIn <span className="opacity-40">↗</span>
              </a>
              <a
                href={`mailto:${site.email}`}
                className="text-[15px] text-[rgb(var(--fg)/0.8)] transition-colors hover:text-[rgb(var(--accent))]"
              >
                {site.email} <span className="opacity-40">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-20 md:mt-24">
        <div className="flex items-baseline justify-between border-b border-[rgb(var(--line)/0.14)] pb-3.5">
          <h3 className={SECTION_LABEL}>Timeline</h3>
          <span className="text-[13px] font-medium tracking-[0.14em] text-[rgb(var(--fg)/0.28)]">
            {String(timeline.length).padStart(2, "0")}
          </span>
        </div>

        <ol className="flex flex-col">
          {timeline.map((item, i) => (
            <li
              key={`${item.year}-${item.event}`}
              className="group grid grid-cols-1 gap-2 border-b border-[rgb(var(--line)/0.09)] py-6 transition-colors hover:bg-[rgb(var(--line)/0.03)] md:grid-cols-[210px_1fr_300px] md:items-baseline md:gap-6"
            >
              <span
                className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${
                  i === 0 ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--fg)/0.45)]"
                }`}
              >
                {item.year}
              </span>
              {"href" in item && item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[24px] font-medium leading-[1.1] tracking-[-0.03em] transition-colors hover:text-[rgb(var(--accent))] md:text-[30px]"
                >
                  {item.event} <span className="opacity-40">↗</span>
                </a>
              ) : (
                <span className="text-[24px] font-medium leading-[1.1] tracking-[-0.03em] transition-colors group-hover:text-[rgb(var(--accent))] md:text-[30px]">
                  {item.event}
                </span>
              )}
              <span className="text-sm leading-[1.45] text-[rgb(var(--fg)/0.5)] md:text-right">
                {item.role}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Certifications */}
      <div className="mt-20 md:mt-24">
        <div className="flex items-baseline justify-between border-b border-[rgb(var(--line)/0.14)] pb-3.5">
          <h3 className={SECTION_LABEL}>Certifications</h3>
          <span className="text-[13px] font-medium tracking-[0.14em] text-[rgb(var(--fg)/0.28)]">
            {String(certifications.length).padStart(2, "0")}
          </span>
        </div>

        <ul className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
          {certifications.map((cert) => (
            <li
              key={cert.name}
              className="flex flex-col gap-1 border-b border-[rgb(var(--line)/0.09)] py-5 md:flex-row md:items-baseline md:justify-between md:gap-4"
            >
              <span className="text-[18px] font-medium tracking-[-0.015em]">{cert.name}</span>
              <span className="whitespace-nowrap text-[13px] text-[rgb(var(--fg)/0.45)]">
                {cert.issuer} · {cert.year}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
