"use client";

import Link from "next/link";
import { useTextMode } from "@/components/TextModeProvider";

export default function Header() {
  const { textMode, toggle } = useTextMode();

  return (
    <header className="border-b border-[rgba(var(--line),0.14)]">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))]">
          Editorial Monochrome
        </div>

        <nav className="flex items-center gap-4 text-xs uppercase tracking-[0.22em]">
          <Link href="/work" className="hover:underline">Work</Link>
          <span className="opacity-30">/</span>
          <Link href="/about" className="hover:underline">About</Link>
          <span className="opacity-30">/</span>
          <Link href="/contact" className="hover:underline">Contact</Link>
          <span className="opacity-30">/</span>

          <button
            onClick={toggle}
            className="rounded-md border border-[rgba(var(--line),0.22)] px-3 py-1 hover:bg-black/5 transition"
          >
            Text mode {textMode ? "ON" : "OFF"}
          </button>
        </nav>
      </div>
    </header>
  );
}
