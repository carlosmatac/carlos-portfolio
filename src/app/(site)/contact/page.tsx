import Container from "@/components/Container";
import { site } from "@/content/site";

function ContactItem({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      className="block rounded-[18px] border border-[rgba(var(--line),0.14)] bg-black/[0.02] p-6 hover:bg-black/[0.04] transition"
    >
      <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">{label}</div>
      <div className="mt-3 font-[var(--font-serif)] text-xl tracking-tight">{value}</div>
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Open →</div>
    </a>
  );
}

export default function ContactPage() {
  const mailto = `mailto:${site.email}?subject=${encodeURIComponent("Hello Carlos")}&body=${encodeURIComponent(
    "Hi Carlos,\n\nI came across your portfolio and…\n\n—"
  )}`;

  return (
    <Container>
      <section className="py-14 md:py-16">
        <div className="text-center">
          <h1 className="font-[var(--font-serif)] text-[clamp(2.6rem,6vw,4.2rem)] leading-[0.92] tracking-[-0.02em]">
            Contact
          </h1>
          <p className="mt-4 text-sm md:text-base uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
            Let’s talk — concise and to the point
          </p>

          <p className="mt-5 mx-auto max-w-2xl text-sm text-[rgb(var(--muted))] leading-relaxed">
            Best channel is email. If you prefer, you can reach out on LinkedIn as well.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-5xl grid gap-6 md:grid-cols-3">
          <ContactItem label="Email" value={site.email} href={mailto} />
          <ContactItem label="LinkedIn" value="Profile" href={site.links.linkedin} />
          <ContactItem label="GitHub" value="Projects" href={site.links.github} />
        </div>

        <div className="mx-auto mt-10 max-w-5xl rounded-[18px] border border-[rgba(var(--line),0.14)] bg-[rgb(var(--bg))] p-6">
          <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
            Quick note template
          </div>

          <div className="mt-4 text-sm text-[rgb(var(--muted))] leading-relaxed">
            <p className="mb-3">
              If you want to make it easy for me:
            </p>
            <ul className="space-y-2">
              <li>• Context: where you found me</li>
              <li>• Goal: what you want to achieve</li>
              <li>• Constraints: timeline / location / scope</li>
            </ul>
          </div>
        </div>
      </section>
    </Container>
  );
}
