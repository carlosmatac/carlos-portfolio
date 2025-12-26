import Link from "next/link";
import Container from "./Container";

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition"
  >
    {children}
  </Link>
);

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[rgb(var(--bg))]/80 backdrop-blur">
      <Container>
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            CM
          </Link>
          <nav className="flex items-center gap-5">
            <NavLink href="/work">Work</NavLink>
            <NavLink href="/about">About</NavLink>
            <NavLink href="/contact">Contact</NavLink>
            <a
              href="/cv.pdf"
              className="text-sm text-[rgb(var(--fg))] hover:opacity-70 transition"
            >
              CV
            </a>
          </nav>
        </div>
      </Container>
    </header>
  );
}
