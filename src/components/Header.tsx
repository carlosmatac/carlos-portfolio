"use client";

import Link from "next/link";
import Container from "./Container";
import { useTextMode } from "./TextModeProvider";

const NavLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="text-xs tracking-[0.18em] uppercase text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition">
    {label}
  </Link>
);

export default function Header() {
  const { textMode, toggle } = useTextMode();

  return (
    <header className="border-b border-[rgba(var(--line),0.12)]">
      <Container>
        <div className="h-14 flex items-center justify-between">
          <div className="text-xs tracking-[0.18em] uppercase text-[rgb(var(--muted))]">
            Editorial Monochrome
          </div>

          <nav className="flex items-center gap-3">
            <NavLink href="/work" label="Work" />
            <span className="opacity-40">/</span>
            <NavLink href="/about" label="About" />
            <span className="opacity-40">/</span>
            <NavLink href="/contact" label="Contact" />
            <span className="opacity-40">/</span>
            <button
              type="button"
              onClick={toggle}
              className="text-xs tracking-[0.18em] uppercase text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition"
            >
              Text mode {textMode ? "On" : "Off"}
            </button>
          </nav>
        </div>
      </Container>
    </header>
  );
}
