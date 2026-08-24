import { projects } from "@/content/projects";
import { site } from "@/content/site";

const years = projects.map((p) => Number(p.year)).filter((y) => !Number.isNaN(y));
const RANGE = years.length ? `${Math.min(...years)} — ${Math.max(...years)}` : "";

export default function WorkSection() {
  return (
    <section id="work" aria-label="Work" className="px-6 pb-20 pt-20 md:px-16 md:pb-24 md:pt-28">
      <div className="border-t border-[rgb(var(--line)/0.14)] pt-4">
        <h2
          className="text-[22vw] uppercase leading-[0.82] tracking-[-0.06em] md:text-[17vw]"
          style={{ fontWeight: 620 }}
        >
          Work
        </h2>
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between md:gap-6">
          <p className="max-w-[520px] text-[17px] leading-[1.5] text-[rgb(var(--fg)/0.55)]">
            Newest first. Data platforms, distributed systems and a couple of things written close to
            the metal. Every row goes straight to the code.
          </p>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[rgb(var(--fg)/0.35)]">
            {RANGE} · {String(projects.length).padStart(2, "0")} projects
          </span>
        </div>
      </div>

      <ol className="mt-14 border-t border-[rgb(var(--line)/0.14)] md:mt-16">
        {projects.map((p, i) => {
          const links = p.links ?? [];
          const primary = links[0]?.href;

          return (
            <li
              key={p.slug}
              className="work-item border-b border-[rgb(var(--line)/0.09)] py-7 transition-[background-color,padding] duration-150 hover:bg-[rgb(var(--line)/0.03)] md:hover:pl-4"
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[56px_1fr_190px_150px_40px] md:items-baseline md:gap-5">
                <span className="text-xs font-semibold tracking-[0.14em] text-[rgb(var(--fg)/0.3)]">
                  {String(i + 1).padStart(2, "0")}
                </span>

                {primary ? (
                  <a
                    href={primary}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="work-title text-[32px] font-medium leading-[1.02] tracking-[-0.04em] transition-colors md:text-[44px]"
                  >
                    {p.title}
                  </a>
                ) : (
                  <span className="work-title text-[32px] font-medium leading-[1.02] tracking-[-0.04em] md:text-[44px]">
                    {p.title}
                  </span>
                )}

                <span className="text-[13px] font-medium uppercase tracking-[0.1em] text-[rgb(var(--fg)/0.42)]">
                  {p.role}
                </span>
                <span className="text-[13px] font-medium tracking-[0.1em] text-[rgb(var(--fg)/0.42)] md:text-right">
                  {p.year}
                  {p.status ? ` · ${p.status}` : ""}
                </span>
                <span
                  aria-hidden="true"
                  className="work-go hidden text-[22px] text-[rgb(var(--fg)/0.2)] transition-colors md:block md:text-right"
                >
                  ↗
                </span>
              </div>

              <div className="work-detail md:pl-[76px]">
                <p className="max-w-[640px] text-[15px] leading-[1.45] text-[rgb(var(--fg)/0.62)] md:text-[17px]">
                  {p.oneLiner}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                  <ul className="flex flex-wrap gap-2">
                    {p.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-[rgb(var(--line)/0.16)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--fg)/0.65)]"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>

                  {links.length > 0 && (
                    <div className="flex flex-wrap gap-2.5">
                      {links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[rgb(var(--line)/0.22)] px-4 text-[13px] font-semibold transition-colors hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))] hover:text-[rgb(var(--bg))]"
                        >
                          {link.label} <span className="opacity-50">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="mt-20 flex flex-col gap-4 border-t border-[rgb(var(--line)/0.14)] pt-6 md:mt-24 md:flex-row md:items-end md:justify-between md:gap-8">
        <a
          href={`mailto:${site.email}`}
          className="text-[28px] font-medium tracking-[-0.035em] transition-colors hover:text-[rgb(var(--accent))] md:text-[40px]"
        >
          Say hello →
        </a>
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[rgb(var(--fg)/0.35)]">
          {site.location} · {site.email}
        </span>
      </footer>
    </section>
  );
}
