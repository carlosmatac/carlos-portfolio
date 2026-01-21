"use client";

import Link from "next/link";
import { useTextMode } from "@/components/TextModeProvider";
import { useTheme } from "@/components/ThemeProvider";


export default function Header() {
  const { textMode, toggle: toggleTextMode } = useTextMode();
  // Theme toggle can be hidden or integrated differently if we want strict adherence to the reference which seems to handle modes implicitly or via text mode. 
  // For now, I'll keep it but maybe make it less obtrusive or part of the list if requested.
  // The reference has "TEXT MODE" as a link-like item.
  // I will make "Text Mode" look like a link.

  return (
    <header className="border-b border-black/[0.08] dark:border-white/[0.08]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-6 flex items-center justify-between">
        {/* Left: Name */}
        <Link
          href="/"
          className="text-sm font-bold tracking-widest uppercase text-black dark:text-white"
        >
          Carlos Mata
        </Link>

        {/* Right: Nav */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium tracking-widest uppercase text-gray-500 dark:text-gray-400">
          <Link href="/work" className="hover:text-black dark:hover:text-white transition-colors">
            Work
          </Link>
          <Link href="/about" className="hover:text-black dark:hover:text-white transition-colors">
            About
          </Link>
          <Link href="/contact" className="hover:text-black dark:hover:text-white transition-colors">
            Contact
          </Link>

          <button
            onClick={toggleTextMode}
            className="hover:text-black dark:hover:text-white transition-colors uppercase"
          >
            Text Mode {textMode ? "On" : ""}
          </button>
        </nav>

        {/* Mobile Menu Icon could go here, omitting for now to focus on desktop reference match */}
      </div>
    </header>
  );
}
