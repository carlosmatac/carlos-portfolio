import Container from "@/components/Container";
import { site } from "@/content/site";

export default function ContactPage() {
  const mailto = `mailto:${site.email}`;

  return (
    <Container>
      <section className="py-20 md:py-32">
        {/* Editorial Header */}
        <div className="border-b border-[rgb(var(--line))] pb-10 mb-16 md:mb-24">
          <h1 className="font-serif text-6xl md:text-8xl font-medium tracking-tight mb-6">
            Contact
          </h1>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-sm uppercase tracking-[0.15em] font-medium opacity-70">
            <span>Let's Build Together</span>
            <span>{site.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-24">
          {/* Left Column: Channels */}
          <div className="md:col-span-4 space-y-12">
            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">Direct</h3>
              <a href={mailto} className="block text-lg font-medium hover:opacity-50 transition-opacity">
                {site.email}
              </a>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-6 opacity-40">Socials</h3>
              <div className="flex flex-col gap-4 text-sm font-medium opacity-80">
                <a href={site.links.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-50 transition-opacity">
                  LinkedIn ↗
                </a>
                <a href={site.links.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-50 transition-opacity">
                  GitHub ↗
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Statement */}
          <div className="md:col-span-8">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-40">Get in Touch</h3>

            <div className="space-y-8 text-xl md:text-2xl leading-relaxed font-serif">
              <p>
                The best way to reach me is via email. I’m always open to discussing <span className="italic">new opportunities</span>, <span className="italic">collaborations</span>, or just chatting about systems engineering.
              </p>
            </div>

            <div className="mt-16 pt-16 border-t border-[rgb(var(--line)/0.1)]">
              <h3 className="text-xs uppercase tracking-[0.2em] font-bold mb-8 opacity-40">Pro Tip</h3>
              <p className="text-base font-medium opacity-80 leading-relaxed max-w-lg mb-8">
                If you want to make it easy for me, include context (where you found me), your goal, and any constraints (timeline/scope).
              </p>
              <a
                href={mailto}
                className="inline-block border-b border-[rgb(var(--line))] pb-1 hover:opacity-50 transition-opacity uppercase tracking-widest text-sm font-bold"
              >
                Send Brief Email →
              </a>
            </div>
          </div>
        </div>
      </section>
    </Container>
  );
}
