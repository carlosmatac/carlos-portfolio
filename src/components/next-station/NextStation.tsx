"use client";

import "./next-station.css";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { places } from "@/content/places";
import { site } from "@/content/site";
import SplitFlap from "./SplitFlap";

/** Where the last row could be heading. It never settles: that is the point. */
export const SOMEWHERE = ["SOMEWHERE NEW", "TOKYO", "NEW YORK", "LISBON", "SAN FRANCISCO", "ZURICH", "SINGAPORE", "LONDON"];
const WIDTH = { year: 4, code: 3, city: 13, note: 14, status: 8 };
const ROW_DELAY = 220;

const departures = places.map((place, index) => ({
  id: place.id, accent: place.accent, year: place.period.match(/\d{4}/)![0], code: place.code, city: place.city, note: place.note,
  status: index === places.length - 1 ? "Here now" : "Arrived",
}));

function useMadridClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const format = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
    const update = () => setTime(format.format(new Date()));
    update();
    const timer = window.setInterval(update, 10_000);
    return () => window.clearInterval(timer);
  }, []);
  return time;
}

export default function NextStation() {
  const time = useMadridClock();
  const [destination, setDestination] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setDestination(index => (index + 1) % SOMEWHERE.length), 3600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="next-station">
      <div className="ns-backdrop" aria-hidden="true" />
      <div className="ns-inner">
        <header className="ns-head">
          <div className="ns-route" aria-hidden="true">
            <span className="ns-index">06<span> / ??</span></span>
            <span className="ns-track">{departures.map(stop => <i key={stop.id} style={{ "--stop": stop.accent } as CSSProperties} />)}<i data-state="unknown" /></span>
            <span className="ns-kicker">The end of the line, for now</span>
          </div>
          <div className="ns-title">
            <h1>Next station<span>?</span></h1>
            <p>
              Madrid is home for now, and there is plenty left to build here. But if five stops taught me anything, it is
              that the best ones are rarely planned: a host family, a promise made on a bus, a summer that became a year and a half.
            </p>
          </div>
        </header>

        <section className="ns-board" aria-labelledby="ns-board-title">
          <div className="ns-board-top">
            <h2 id="ns-board-title"><span className="ns-live" aria-hidden="true" />Departures <span>· Salidas</span></h2>
            <p>Madrid <time suppressHydrationWarning>{time || "--:--"}</time></p>
          </div>
          <table>
            <thead>
              <tr><th scope="col">Year</th><th scope="col" className="ns-col-code">Code</th><th scope="col">Destination</th><th scope="col" className="ns-col-note">Note</th><th scope="col">Status</th></tr>
            </thead>
            <tbody>
              {departures.map((row, index) => (
                <tr key={row.id} data-current={row.status === "Here now" || undefined} style={{ "--stop": row.accent } as CSSProperties}>
                  <td><SplitFlap value={row.year} width={WIDTH.year} delay={index * ROW_DELAY} /></td>
                  <td className="ns-col-code"><SplitFlap value={row.code} width={WIDTH.code} delay={index * ROW_DELAY + 60} /></td>
                  <td><SplitFlap value={row.city} width={WIDTH.city} delay={index * ROW_DELAY + 120} /></td>
                  <td className="ns-col-note"><SplitFlap value={row.note} width={WIDTH.note} delay={index * ROW_DELAY + 180} /></td>
                  <td className="ns-status"><SplitFlap value={row.status} width={WIDTH.status} delay={index * ROW_DELAY + 240} /></td>
                </tr>
              ))}
              <tr data-next>
                <td><SplitFlap value="20??" width={WIDTH.year} delay={departures.length * ROW_DELAY} /></td>
                <td className="ns-col-code"><SplitFlap value="???" width={WIDTH.code} delay={departures.length * ROW_DELAY + 60} /></td>
                <td><SplitFlap value={SOMEWHERE[destination]} width={WIDTH.city} delay={destination ? 0 : departures.length * ROW_DELAY + 120} label="Unknown" /></td>
                <td className="ns-col-note"><SplitFlap value="Who knows" width={WIDTH.note} delay={departures.length * ROW_DELAY + 180} /></td>
                <td className="ns-status"><SplitFlap value="TBA" width={WIDTH.status} delay={departures.length * ROW_DELAY + 240} label="To be announced" /></td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="ns-actions">
          <a className="ns-primary" href={`mailto:${site.email}?subject=${encodeURIComponent("Next station")}`}>
            Say hello
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9.5M8.5 3.5 13 8l-4.5 4.5" /></svg>
          </a>
          <a className="ns-secondary" href={site.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span></a>
          <Link className="ns-restart" href="/">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.2 8a4.8 4.8 0 1 0 1.4-3.4M3 2.6v2.6h2.6" /></svg>
            Start the journey again
          </Link>
        </footer>
      </div>
    </main>
  );
}
