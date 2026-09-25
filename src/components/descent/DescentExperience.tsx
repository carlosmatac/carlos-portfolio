"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { places } from "@/content/places";
import { site } from "@/content/site";
import { journeyAt } from "./journey";
import { JOURNEY, EARTH_STOP, anchorProgress, stopProgress } from "./journey-timeline";
import { damp } from "./motion";
import { ST_LOUIS_ART, stLouisComposition } from "./cities/st-louis-art";
import { adjacentStop, createFlight, flightPosition, WheelGesture, createSeek, seekFrame, type JourneySeek, type JourneyFlight } from "./scroll-journey";
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
    const fallbackCity = stage.querySelector<HTMLElement>(".fallback-city")!;
    const fallbackArch = fallbackCity.querySelector<HTMLElement>(".fallback-city-arch")!;
    const fallbackClouds = Array.from(fallbackCity.querySelectorAll<HTMLElement>(".fallback-city-cloud"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scene: DescentScene | null = null;
    let disposed = false, raf = 0, last = 0, progress = 0, target = 0;
    let pageHeight = 1, sectionTop = 0, lastRender = 0;
    let flight: JourneyFlight | null = null;
    let seek: JourneySeek | null = null;
    let measured = false;
    let writtenScroll = -1;
    const wheelGesture = new WheelGesture();
    let touchY = 0, touchX = 0, touchUsed = false, hiddenAt = 0;
    function onVisibility() {
      const now = performance.now();
      if (document.hidden) hiddenAt = now;
      else {
        if (flight && hiddenAt) flight.started += now - hiddenAt;
        if (seek && hiddenAt) seek.started += now - hiddenAt;
        hiddenAt = 0;
        last = now;
      }
    }
    function onMotionPreference() {
      if (reduced.matches && (flight || seek)) {
        target = (flight ?? seek)!.to;
        progress = target;
        flight = null; seek = null;
        writtenScroll = sectionTop + progress * pageHeight;
        window.scrollTo({ top: writtenScroll, behavior: "instant" });
      }
      measure();
    }

    function moveTo(destination: number, explicit = false) {
      flight = null; seek = null;
      target = progress;
      if (reduced.matches) {
        progress = target = destination;
        writtenScroll = sectionTop + destination * pageHeight;
        window.scrollTo({ top: writtenScroll, behavior: "instant" });
        return;
      }
      if (Math.abs(progress - destination) < 0.0001) return;
      const adjacent = Math.abs(adjacentStop(progress, Math.sign(destination - progress)) - destination) < 1e-8;
      const nextFlight = createFlight(progress, destination, performance.now());
      if (explicit && !(adjacent && nextFlight.profile === "cloud")) seek = createSeek(progress, destination, performance.now());
      else flight = nextFlight;
    }
    function busy() { return flight !== null || seek !== null; }
    function canGuide(event: Event) {
      const element = event.target instanceof Element ? event.target : null;
      return !reduced.matches && !element?.closest("input, textarea, select, [contenteditable=true], [data-native-scroll]")
        && window.scrollY >= sectionTop - 1 && window.scrollY <= sectionTop + pageHeight + 1;
    }
    function onWheel(event: WheelEvent) {
      if (!canGuide(event) || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      const direction = wheelGesture.push(delta, performance.now(), busy());
      if (direction) moveTo(adjacentStop(progress, direction));
    }
    function onKey(event: KeyboardEvent) {
      if (!canGuide(event) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest("a, button")) return;
      const direction = ["ArrowDown", "PageDown", " "].includes(event.key) ? (event.shiftKey ? -1 : 1)
        : ["ArrowUp", "PageUp"].includes(event.key) ? -1 : 0;
      if (!direction && event.key !== "Home" && event.key !== "End") return;
      event.preventDefault();
      if (event.repeat) return;
      if (event.key === "Home" || event.key === "End") moveTo(event.key === "Home" ? 0 : stopProgress(places.length - 1), true);
      else if (!busy()) moveTo(adjacentStop(progress, direction));
    }
    function onTouchStart(event: TouchEvent) {
      touchUsed = event.touches.length !== 1 || busy();
      touchY = event.touches[0]?.clientY ?? 0;
      touchX = event.touches[0]?.clientX ?? 0;
    }
    function onTouchMove(event: TouchEvent) {
      if (!canGuide(event) || event.touches.length !== 1) return;
      const delta = touchY - event.touches[0].clientY;
      if (Math.abs(event.touches[0].clientX - touchX) > Math.abs(delta)) return;
      event.preventDefault();
      if (!touchUsed && Math.abs(delta) > 24) {
        touchUsed = true;
        if (!busy()) moveTo(adjacentStop(progress, Math.sign(delta)));
      }
    }
    function onNavigate(event: MouseEvent) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const destination = anchorProgress(link?.hash.slice(1) ?? "");
      if (destination === undefined) return;
      event.preventDefault();
      history.replaceState(null, "", link!.hash);
      moveTo(destination, true);
    }

    function onHashChange() {
      const destination = anchorProgress(location.hash.slice(1));
      if (destination !== undefined) moveTo(destination, true);
    }
    function measure() {
      const previousHeight = pageHeight, previousTop = sectionTop;
      pageHeight = Math.max(1, section.offsetHeight - (stage.clientHeight || window.innerHeight));
      sectionTop = section.getBoundingClientRect().top + window.scrollY;
      scene?.resize();
      const width = stage.clientWidth || window.innerWidth, height = stage.clientHeight || window.innerHeight;
      const composition = stLouisComposition(width, height), images = ST_LOUIS_ART[width < 700 ? "mobile" : "desktop"];
      fallbackCity.style.setProperty("--arch-image", `url(${images.arch})`);
      fallbackCity.style.setProperty("--cloud-image", `url(${images.clouds})`);
      fallbackArch.style.left = `${composition.arch.x * 100}%`;
      fallbackArch.style.top = `${composition.arch.y * 100}%`;
      fallbackArch.style.height = `${composition.arch.height * 100}%`;
      fallbackClouds.forEach((cloud, index) => {
        const layout = composition.clouds[index];
        cloud.style.left = `${layout.x * 100}%`;
        cloud.style.top = `${layout.y * 100}%`;
        cloud.style.width = `${layout.width * 100}%`;
      });
      if (measured && (pageHeight !== previousHeight || sectionTop !== previousTop)) {
        writtenScroll = sectionTop + (busy() ? progress : target) * pageHeight;
        window.scrollTo({ top: writtenScroll, behavior: "instant" });
      } else if (!measured) {
        target = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / pageHeight));
        measured = true;
      }
    }
    function onScroll() {
      if (Math.abs(window.scrollY - writtenScroll) < 2) return;
      // Scrollbar dragging, browser history and native accessibility navigation remain usable.
      flight = null; seek = null;
      const destination = Math.max(0, Math.min(1, (window.scrollY - sectionTop) / pageHeight));
      if (!reduced.matches && Math.abs(destination - target) * JOURNEY.totalH > 4) {
        seek = createSeek(progress, destination, performance.now());
      }
      target = destination;
    }
    function draw(now: number) {
      if (disposed) return;
      raf = requestAnimationFrame(draw);
      if (document.hidden) { last = now; return; }
      const delta = (now - last) / 1000; last = now;
      const travelling = busy();
      let seekOpacity = 0;
      if (seek) {
        const frame = seekFrame(seek, now);
        const switching = progress !== frame.position;
        seekOpacity = switching ? 1 : frame.opacity;
        if (switching) seek.started = now - 180;
        progress = target = frame.position;
        writtenScroll = sectionTop + progress * pageHeight;
        window.scrollTo({ top: writtenScroll, behavior: "instant" });
        if (frame.done && !switching) seek = null;
      } else if (flight && !reduced.matches) {
        progress = flightPosition(flight, now);
        target = progress;
        writtenScroll = sectionTop + progress * pageHeight;
        window.scrollTo({ top: writtenScroll, behavior: "instant" });
        if (now >= flight.started + flight.duration) {
          flight = null;
        }
      } else {
        if (flight) { target = flight.to; flight = null; }
        progress = reduced.matches ? target : damp(progress, target, delta);
        if (Math.abs(target - progress) < 0.00005) progress = target;
      }
      const frame = journeyAt(progress, reduced.matches);
      stage.dataset.phase = frame.timeline.phase.kind;
      stage.dataset.cityBlend = frame.timeline.blend.toFixed(4);
      stage.dataset.position = progress.toFixed(6);
      stage.style.setProperty("--seek-opacity", seekOpacity.toFixed(4));
      const stopId = frame.timeline.phase.kind === "intro" ? "intro" : frame.earth.overview > 0 ? "earth" : places[frame.earth.active].id;
      stage.dataset.stop = stopId;
      stage.dataset.city = frame.timeline.city?.id ?? "";
      stage.style.setProperty("--identity-opacity", frame.identity.toFixed(4));
      stage.style.setProperty("--prompt-opacity", frame.prompt.toFixed(4));
      stage.style.setProperty("--fallback-zoom", `${1 + frame.zoom * 2.2}`);
      stage.style.setProperty("--screen-opacity", frame.screen.toFixed(4));
      stage.style.setProperty("--earth-opacity", frame.earth.visible.toFixed(4));
      stage.style.setProperty("--city-opacity", String(Number(frame.timeline.passage?.scene === "city")));
      stage.style.setProperty("--passage-opacity", (frame.timeline.passage?.cover ?? 0).toFixed(4));
      stage.style.setProperty("--passage-y", `${((frame.timeline.passage?.depth ?? 0) - 0.5) * 70}%`);
      stage.style.setProperty("--earth-intro", `${frame.earth.visible * frame.earth.overview * (1 - (frame.timeline.passage?.cover ?? 0))}`);
      stage.style.setProperty("--shade-opacity", `${frame.earth.navigation * (1 - frame.earth.overview) * (1 - (frame.timeline.passage?.cover ?? 0))}`);
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
      navigation.forEach(link=>{
        link.setAttribute("aria-current",link.hash===`#${stopId}`?"step":"false");
        link.tabIndex=frame.earth.navigation>0.5?0:-1;
      });
      tourControls.forEach(control=>{
        control.inert = frame.earth.navigation < 0.5;
        control.setAttribute("aria-hidden", String(frame.earth.navigation < 0.5));
      });
      stage.dataset.travelling = String(travelling);
      if (travelling || progress !== target || now - lastRender >= 1000 / 30) {
        scene?.render(frame, now / 1000, reduced.matches);
        lastRender = now;
      }
    }
    measure(); progress = target;
    const initialDestination = anchorProgress(location.hash.slice(1));
    if (initialDestination !== undefined) {
      progress = target = initialDestination;
      writtenScroll = sectionTop + progress * pageHeight;
      window.scrollTo({ top: writtenScroll, behavior: "instant" });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotionPreference);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("click", onNavigate);
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
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotionPreference);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("click", onNavigate);
      observer.disconnect(); scene?.dispose();
    };
  }, []);

  return (
    <main className="descent-journey" ref={journey} style={{
      "--journey-height": `${(JOURNEY.totalH + 1) * 100}svh`,
      "--journey-reduced-height": `${(JOURNEY.totalH / 2 + 1) * 100}svh`,
    } as CSSProperties}>
      <div className="descent-viewport" ref={viewport} data-renderer="fallback" data-phase="monitor">
        <div className="descent-canvas" ref={host} />
        <div className="fallback-monitor" aria-hidden="true"><div className="fallback-glow" /></div>
        <div className="monitor-identity" ref={identity}>
          <div className="identity-center"><span className="initials" aria-hidden="true">CM</span><h1>Carlos Mata</h1></div>
          <a className="scroll-invitation" href="#earth">Scroll to discover<span className="scroll-stem" aria-hidden="true" /></a>
        </div>
        <div className="fallback-earth" aria-hidden="true" />
        <div className="fallback-city" aria-hidden="true">
          <div className="fallback-city-cloud fallback-city-cloud-back" />
          <div className="fallback-city-arch" />
          <div className="fallback-city-cloud fallback-city-cloud-front" />
          <div className="fallback-city-cloud fallback-city-cloud-near" />
        </div>
        <div className="fallback-granada" aria-hidden="true" />
        <div className="fallback-brno" aria-hidden="true" />
        <div className="fallback-munich" aria-hidden="true" />
        <div className="earth-shade" aria-hidden="true" />
        <p className="earth-intro" aria-hidden="true">A few places that made me.</p>
        <div className="fallback-passage" aria-hidden="true" />
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
          <a href="#earth" tabIndex={-1}><span className="journey-dot" aria-hidden="true" /><span>Earth</span></a>
          {places.map(place=><a key={place.id} href={`#${place.id}`} tabIndex={-1}><span className="journey-dot" aria-hidden="true" /><span>{place.city}</span></a>)}
        </nav>
        <div className="earth-footer" inert aria-hidden="true"><span>SCROLL TO TRAVEL</span><a href="/textures/earth/ATTRIBUTION.md" target="_blank" rel="noopener noreferrer">Earth imagery · Solar System Scope</a></div>
        <div className="scene-vignette" aria-hidden="true" />
        <div className="journey-seek" aria-hidden="true" />
      </div>
      <div className="arrival-anchor" id="earth" style={{top:`calc((100% - 100svh) * ${EARTH_STOP})`}} aria-hidden="true" />
      {places.map((place,index)=><div key={place.id} className="arrival-anchor" id={place.id} style={{top:`calc((100% - 100svh) * ${stopProgress(index)})`}} aria-hidden="true" />)}
      <noscript><style>{`.descent-viewport{display:none}.descent-journey{height:auto!important}.noscript-story{padding:8vw;max-width:800px}.noscript-story section{margin:60px 0}`}</style><div className="noscript-story"><h1>Carlos Mata</h1>{places.map(place=><section key={place.id}><h2>{place.city} · {place.country}</h2><p>{place.period}</p><p>{place.description}</p></section>)}<a href={site.links.linkedin}>LinkedIn ↗</a></div></noscript>
    </main>
  );
}
