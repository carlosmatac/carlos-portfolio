"use client";

import Link from "next/link";
import { useTextMode } from "@/components/TextModeProvider";
import { useTheme } from "@/components/ThemeProvider";


export default function Header() {
  const { textMode, toggle: toggleTextMode } = useTextMode();
  const { darkMode, toggle: toggleTheme } = useTheme();

  return (
    <header className="border-b border-[rgba(var(--line),0.14)]">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xs uppercase tracking-[0.22em] text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition">
          CARLOS MATA
        </Link>

        <nav className="flex items-center gap-4 text-xs uppercase tracking-[0.22em]">
          <Link href="/work" className="hover:underline">Work</Link>
          <span className="opacity-30">/</span>
          <Link href="/about" className="hover:underline">About</Link>
          <span className="opacity-30">/</span>
          <Link href="/contact" className="hover:underline">Contact</Link>
          <span className="opacity-30">/</span>

          <button
            onClick={toggleTextMode}
            className="rounded-md border border-[rgba(var(--line),0.22)] px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            Text mode {textMode ? "ON" : "OFF"}
          </button>
          <span className="opacity-30">/</span>
          <button
            onClick={toggleTheme}
            className="rounded-md border border-[rgba(var(--line),0.22)] px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </nav>
      </div>
    </header>
  );
}
