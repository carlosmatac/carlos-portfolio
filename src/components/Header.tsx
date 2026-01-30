"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTextMode } from "@/components/TextModeProvider";
import { useActiveSection } from "@/hooks/useActiveSection";
import { useSmoothScroll } from "@/hooks/useSmoothScroll";
import { useMemo } from "react";

const SECTION_IDS = ["hero", "work", "about", "contact"];

export default function Header() {
  const { textMode, toggle: toggleTextMode } = useTextMode();
  const pathname = usePathname();
  const activeSection = useActiveSection(SECTION_IDS);
  const { scrollToSection, scrollToTop } = useSmoothScroll();

  const isHome = pathname === "/";

  // Determine active state for nav items
  const getNavActiveState = useMemo(() => {
    return (navItem: string) => {
      if (isHome) {
        // On home page, use intersection observer state
        return activeSection === navItem;
      } else {
        // On other pages, match pathname
        return pathname === `/${navItem}`;
      }
    };
  }, [isHome, activeSection, pathname]);

  const handleNavClick = (e: React.MouseEvent, sectionId: string) => {
    if (isHome) {
      e.preventDefault();
      scrollToSection(sectionId);
    }
    // If not on home, let the Link component handle navigation normally
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      scrollToTop();
    }
    // If not on home, let the Link navigate to /
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[rgb(var(--line)/0.08)] bg-[rgb(var(--bg)/0.85)] backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12 py-6 flex items-center justify-between">
        {/* Left: Name */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="text-sm font-bold tracking-widest uppercase transition-opacity hover:opacity-60"
        >
          Carlos Mata
        </Link>

        {/* Right: Nav */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium tracking-widest uppercase">
          <NavLink
            href={isHome ? "/#work" : "/work"}
            isActive={getNavActiveState("work")}
            onClick={(e) => handleNavClick(e, "work")}
          >
            Work
          </NavLink>
          <NavLink
            href={isHome ? "/#about" : "/about"}
            isActive={getNavActiveState("about")}
            onClick={(e) => handleNavClick(e, "about")}
          >
            About
          </NavLink>
          <NavLink
            href={isHome ? "/#contact" : "/contact"}
            isActive={getNavActiveState("contact")}
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

        {/* Mobile Menu - Simple version */}
        <nav className="md:hidden flex items-center gap-4 text-xs font-medium tracking-widest uppercase">
          <NavLink
            href={isHome ? "/#work" : "/work"}
            isActive={getNavActiveState("work")}
            onClick={(e) => handleNavClick(e, "work")}
          >
            Work
          </NavLink>
          <NavLink
            href={isHome ? "/#about" : "/about"}
            isActive={getNavActiveState("about")}
            onClick={(e) => handleNavClick(e, "about")}
          >
            About
          </NavLink>
          <NavLink
            href={isHome ? "/#contact" : "/contact"}
            isActive={getNavActiveState("contact")}
            onClick={(e) => handleNavClick(e, "contact")}
          >
            Contact
          </NavLink>
        </nav>
      </div>

      {/* Screen reader announcement for section changes */}
      <div aria-live="polite" className="sr-only">
        {activeSection && isHome && `Navigated to ${activeSection} section`}
      </div>
    </header>
  );
}

// NavLink component with active state styling
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
      className={`transition-opacity duration-300 ${isActive
          ? "opacity-100 font-semibold"
          : "opacity-50 hover:opacity-100"
        }`}
    >
      {children}
    </Link>
  );
}
