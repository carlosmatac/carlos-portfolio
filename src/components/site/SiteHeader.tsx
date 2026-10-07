"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { JOURNEY_STOP_EVENT, STATIONS } from "@/content/stations";
import { site } from "@/content/site";
import { ChevronIcon, GitHubIcon, LinkedInIcon, LogoMark, XIcon } from "./icons";

const SOCIAL = [
  { href: site.links.github, label: "GitHub", Icon: GitHubIcon },
  { href: site.links.linkedin, label: "LinkedIn", Icon: LinkedInIcon },
  { href: site.links.x, label: "X (Twitter)", Icon: XIcon },
];

/** Floating bar shared by every page. On the home page the journey listens for the station links. */
export default function SiteHeader() {
  const pathname = usePathname();
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stop, setStop] = useState<string | null>(null);
  const header = useRef<HTMLElement>(null);
  const journeyButton = useRef<HTMLButtonElement>(null);
  const menuId = useId(), stationsId = useId();
  const home = pathname === "/";

  useEffect(() => {
    const onStop = (event: Event) => setStop((event as CustomEvent<string>).detail);
    window.addEventListener(JOURNEY_STOP_EVENT, onStop);
    return () => window.removeEventListener(JOURNEY_STOP_EVENT, onStop);
  }, []);

  useEffect(() => {
    if (!journeyOpen && !menuOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) { setJourneyOpen(false); setMenuOpen(false); }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setJourneyOpen(false); setMenuOpen(false);
      journeyButton.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [journeyOpen, menuOpen]);

  const close = () => { setJourneyOpen(false); setMenuOpen(false); };
  const current = home ? stop : null;

  return (
    <header className="site-header" ref={header} data-menu={menuOpen ? "open" : "closed"}>
      <div className="site-bar">
        {/* On the home page the journey itself handles this link and flies back to the start. */}
        <Link className="site-home" href="/" data-journey-target="top" aria-current={home ? "page" : undefined}
          onClick={event => { close(); if (home) event.preventDefault(); }}>
          <LogoMark className="site-logo" />
          <span>Home</span>
        </Link>
        <nav className="site-links" id={menuId} aria-label="Main">
          <div className="site-journey" data-open={journeyOpen}>
            <button type="button" ref={journeyButton} className="site-link" aria-expanded={journeyOpen} aria-controls={stationsId}
              aria-current={home ? "true" : undefined} onClick={() => setJourneyOpen(open => !open)}>
              Journey <ChevronIcon className="site-chevron" />
            </button>
            <div className="site-dropdown" id={stationsId} hidden={!journeyOpen && !menuOpen}>
              <p className="site-dropdown-label">Journey stations</p>
              <ul>
                {STATIONS.map((station, index) => (
                  <li key={station.id}>
                    <a href={`/#${station.id}`} data-journey-target={station.id} aria-current={current === station.id ? "step" : undefined} onClick={close}>
                      <span className="site-station-index">{String(index).padStart(2, "0")}</span>
                      <span className="site-station-name">{station.label}</span>
                      <span className="site-station-detail">{station.detail}</span>
                    </a>
                  </li>
                ))}
                <li>
                  <Link className="site-station-next" href="/next-station" aria-current={pathname === "/next-station" ? "page" : undefined} onClick={close}>
                    <span className="site-station-index">{String(STATIONS.length).padStart(2, "0")}</span>
                    <span className="site-station-name">Next station</span>
                    <span className="site-station-detail">?</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <Link className="site-link" href="/work" aria-current={pathname.startsWith("/work") ? "page" : undefined} onClick={close}>My work</Link>
          <span className="site-divider" aria-hidden="true" />
          <ul className="site-social">
            {SOCIAL.map(({ href, label, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}><Icon /></a>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" className="site-menu-toggle" aria-expanded={menuOpen} aria-controls={menuId}
          aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => { setMenuOpen(open => !open); setJourneyOpen(false); }}>
          <span aria-hidden="true" /><span aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
