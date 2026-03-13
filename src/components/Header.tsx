"use client";

import Link from "next/link";
import { useTextMode } from "@/components/TextModeProvider";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";

import Image from "next/image";

const SECTION_IDS = ["hero", "work", "about", "contact"];

export default function Header() {
  const { textMode, toggle: toggleTextMode } = useTextMode();
  const activeSection = useActiveSection(SECTION_IDS);
  const { scrollToSection, scrollToTop } = useSmoothScroll();

  const handleNavClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    scrollToSection(sectionId);
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToTop();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[rgb(var(--line)/0.08)] bg-[rgb(var(--bg)/0.85)] backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-6 flex items-center justify-between">
        {/* Left: Logo */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="transition-opacity hover:opacity-60 flex items-center"
        >
          <Image
            src="/carlos_logo.svg"
            alt="Carlos Mata Logo"
            width={32}
            height={32}
            className="w-8 h-8 md:w-10 md:h-10 dark:invert"
          />
        </Link>

        {/* Right: Nav — Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium tracking-widest uppercase">
          <NavLink
            href="/#work"
            isActive={activeSection === "work"}
            onClick={(e) => handleNavClick(e, "work")}
          >
            Work
          </NavLink>
          <NavLink
            href="/#about"
            isActive={activeSection === "about"}
            onClick={(e) => handleNavClick(e, "about")}
          >
            About
          </NavLink>
          <NavLink
            href="/#contact"
            isActive={activeSection === "contact"}
            onClick={(e) => handleNavClick(e, "contact")}
          >
            Contact
          </NavLink>

          <button
            onClick={toggleTextMode}
            className="opacity-50 hover:opacity-100 transition-opacity uppercase"
          >
            Text Mode {textMode ? "On" : ""}
          </button>
        </nav>

        {/* Mobile Nav */}
        <nav className="md:hidden flex items-center gap-4 text-xs font-medium tracking-widest uppercase">
          <NavLink
            href="/#work"
            isActive={activeSection === "work"}
            onClick={(e) => handleNavClick(e, "work")}
          >
            Work
          </NavLink>
          <NavLink
            href="/#about"
            isActive={activeSection === "about"}
            onClick={(e) => handleNavClick(e, "about")}
          >
            About
          </NavLink>
          <NavLink
            href="/#contact"
            isActive={activeSection === "contact"}
            onClick={(e) => handleNavClick(e, "contact")}
          >
            Contact
          </NavLink>
        </nav>
      </div>

      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        {activeSection && `Navigated to ${activeSection} section`}
      </div>
    </header>
  );
}

interface NavLinkProps {
  href: string;
  isActive: boolean;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

function NavLink({ href, isActive, onClick, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`transition-opacity duration-300 ${isActive ? "opacity-100 font-semibold" : "opacity-50 hover:opacity-100"
        }`}
    >
      {children}
    </Link>
  );
}
