"use client";

import { useEffect, useRef } from "react";
import { places } from "@/content/places";
import { site } from "@/content/site";
import { journeyAt, smoothstep } from "./journey";
import { stopProgress } from "./earth-journey";
import type { DescentScene } from "./create-descent";

export default function DescentExperience() {
  const journey = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const identity = useRef<HTMLDivElement>(null);
  const story = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = journey.current!;
    const stage = viewport.current!;
    const display = identity.current!;
    const chapters = Array.from(story.current!.querySelectorAll<HTMLElement>(".earth-chapter"));
    const navigation = Array.from(stage.querySelectorAll<HTMLAnchorElement>(".journey-nav a"));
    const tourControls = Array.from(stage.querySelectorAll<HTMLElement>(".journey-nav, .earth-footer"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scene: DescentScene | null = null;
    let disposed = false, raf = 0, last = 0, progress = 0, target = 0;
    let pageHeight = 1, sectionTop = 0, lastRender = 0;

    function measure() {
      pageHeight = Math.max(1, section.offsetHeight - window.innerHeight);
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      scene?.resize();
      onScroll();
    }
    function onScroll() {
      target = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / pageHeight));
    }
    function draw(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(draw);
      if (document.hidden) { last = now; return; }
      const delta = Math.min((now - last) / 1000, 0.05); last = now;
      progress = reduced.matches ? target : progress + (target - progress) * (1 - Math.exp(-delta * 9));
      if (Math.abs(target - progress) < 0.00005) progress = target;
      const frame = journeyAt(progress, reduced.matches);
      stage.dataset.phase = progress < 0.08 ? "monitor" : progress < 0.25 ? "descent" : "earth";
      stage.dataset.stop = places[frame.earth.active].id;
      stage.style.setProperty("--identity-opacity", frame.identity.toFixed(4));
      stage.style.setProperty("--prompt-opacity", frame.prompt.toFixed(4));
      stage.style.setProperty("--fallback-zoom", `${1 + frame.zoom * 2.2}`);
      stage.style.setProperty("--screen-opacity", frame.screen.toFixed(4));
      stage.style.setProperty("--earth-opacity", frame.earth.visible.toFixed(4));
      stage.style.setProperty("--earth-intro", `${frame.earth.visible * (1 - smoothstep(0.25, 0.285, progress))}`);
      stage.style.setProperty("--nav-opacity", frame.earth.navigation.toFixed(4));
      display.inert = frame.identity < 0.01;
      display.setAttribute("aria-hidden", String(frame.identity < 0.01));
      chapters.forEach((chapter,index)=>{
        const opacity = index === frame.earth.active ? frame.earth.text : 0;
        chapter.style.opacity = `${opacity}`;
        chapter.style.transform = `translateY(${(1-opacity)*16}px)`;
        chapter.inert = opacity < 0.5;
        chapter.setAttribute("aria-hidden", String(opacity < 0.5));
      });
      navigation.forEach((link,index)=>{
        link.setAttribute("aria-current",index===frame.earth.active?"step":"false");
        link.tabIndex=frame.earth.navigation>0.5?0:-1;
      });
      tourControls.forEach(control=>{
        control.inert = frame.earth.navigation < 0.5;
        control.setAttribute("aria-hidden", String(frame.earth.navigation < 0.5));
      });
      if (now - lastRender >= (progress === target ? 1000 / 30 : 1000 / 60)) {
        scene?.render(frame, now / 1000, reduced.matches);
        lastRender = now;
      }
    }
    measure(); progress = target;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure); observer.observe(section);
    raf = requestAnimationFrame(draw);
    import("./create-descent").then(({ createDescent }) => {
      if (disposed || !host.current) return;
      scene = createDescent(host.current, display, () => {
        stage.dataset.renderer = "fallback";
        scene?.dispose(); scene = null;
        display.removeAttribute("style");
      });
      scene.render(journeyAt(progress, reduced.matches), performance.now() / 1000, reduced.matches);
      stage.dataset.renderer = "webgl";
    }).catch(() => {
      stage.dataset.renderer = "fallback";
      display.removeAttribute("style");
    });
    return () => {
      disposed = true; cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", measure);
      observer.disconnect(); scene?.dispose();
    };
  }, []);

  return (
    <main className="descent-journey" ref={journey}>
      <div className="descent-viewport" ref={viewport} data-renderer="fallback" data-phase="monitor">
        <div className="descent-canvas" ref={host} />
        <div className="fallback-monitor" aria-hidden="true"><div className="fallback-glow" /></div>
        <div className="monitor-identity" ref={identity}>
          <div className="identity-center"><span className="initials" aria-hidden="true">CM</span><h1>Carlos Mata</h1></div>
          <a className="scroll-invitation" href="#st-louis">Scroll to discover<span className="scroll-stem" aria-hidden="true" /></a>
        </div>
        <div className="fallback-earth" aria-hidden="true" />
        <div className="earth-shade" aria-hidden="true" />
        <p className="earth-intro" aria-hidden="true">A few places that made me.</p>
        <div className="earth-story" ref={story}>
          {places.map((place,index)=>(
            <section className="earth-chapter" key={place.id} aria-labelledby={`${place.id}-title`} aria-hidden="true" inert>
              <p className="chapter-eyebrow"><span>{String(index+1).padStart(2,"0")} / 05</span>{place.chapter}</p>
              <p className="chapter-country">{place.country}</p>
              <h2 id={`${place.id}-title`}>{place.city}<span>.</span></h2>
              <p className="chapter-period">{place.period}<span> / {place.type}</span></p>
              <h3>{place.title}</h3>
              <p className="chapter-description">{place.description}</p>
              <p className="chapter-coordinates">{place.coordinates}</p>
              {index===places.length-1 && <a className="chapter-link" href={site.links.linkedin} target="_blank" rel="noopener noreferrer">Let’s connect <span aria-hidden="true">↗</span></a>}
            </section>
          ))}
        </div>
        <nav className="journey-nav" aria-label="Places along the way" inert aria-hidden="true">
          {places.map(place=><a key={place.id} href={`#${place.id}`} tabIndex={-1}><span className="journey-dot" aria-hidden="true" /><span>{place.city}</span></a>)}
        </nav>
        <div className="earth-footer" inert aria-hidden="true"><span>SCROLL TO TRAVEL</span><a href="/textures/earth/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">Earth imagery · Solar System Scope</a></div>
        <div className="scene-vignette" aria-hidden="true" />
      </div>
      {places.map((place,index)=><div key={place.id} className="arrival-anchor" id={place.id} style={{top:`calc((100% - 100svh) * ${stopProgress(index)})`}} aria-hidden="true" />)}
      <noscript><style>{`.descent-viewport{display:none}.descent-journey{height:auto!important}.noscript-story{padding:8vw;max-width:800px}.noscript-story section{margin:60px 0}`}</style><div className="noscript-story"><h1>Carlos Mata</h1>{places.map(place=><section key={place.id}><h2>{place.city} · {place.country}</h2><p>{place.period}</p><p>{place.description}</p></section>)}<a href={site.links.linkedin}>LinkedIn ↗</a></div></noscript>
    </main>
  );
}
