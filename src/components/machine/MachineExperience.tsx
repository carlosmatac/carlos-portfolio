"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { projects } from "@/content/projects";
import { timeline } from "@/content/timeline";
import { certifications } from "@/content/certifications";
import type { MachineAPI, MachineAction } from "./create-machine";
import type { MachineRoute } from "@/lib/machine-physics";

type Panel = string | null;
const chapters = [
  { year: "2017–2018", place: "St. Louis", text: "Un intercambio en Northwest High School, Missouri." },
  { year: "2022–2023", place: "Brno", text: "Erasmus en República Checa." },
  { year: "2024", place: "Múnich", text: "Prácticas de Software Engineer en HAT.tec." },
  { year: "2024–feb. 2026", place: "HAT.tec", text: "Software Engineer en Múnich." },
  { year: "2025", place: "Granada", text: "Graduado en Ingeniería Informática y ADE. Estancia SICUE en la UPM." },
  { year: "Feb. 2026", place: "Aksum", text: "Cofundador de una plataforma de conocimiento interno." },
  { year: "Mar. 2026–hoy", place: "Madrid", text: "Data Architect en Nfq. Construyendo también Aksum." },
];
const descriptions: Record<string, string> = {
  "retail-analytics-platform": "De fuentes dispersas a datos que sirven para decidir. Una plataforma de análisis para retail construida con dbt, Snowflake y Python.",
  "energy-market-integrator": "Un sistema que recoge, limpia y unifica datos del mercado eléctrico. Con visibilidad sobre cada paso del recorrido.",
  "flysmart-spain": "Un comparador de vuelos para el mercado español. APIs y scrapers reunidos bajo una misma arquitectura.",
  beersp: "Un lugar para descubrir, catalogar y compartir cervezas artesanas. Backend en Kotlin y Spring Boot, frontend en React.",
  "embedded-stopwatch": "Un cronómetro para Arduino escrito cerca del hardware. Interrupciones, registros y un bucle sin bloqueos.",
  "numbers-letters-solver": "Un motor para resolver Cifras y Letras. Búsqueda en grafos y poda de combinaciones para encontrar caminos cortos.",
};

function Icon({ name, size = 18 }: { name: "arrow" | "sound" | "mute" | "rotate" | "gravity" | "parts" | "close" | "pause" | "play" | "reset"; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    arrow: <path d="M6 18 18 6M6 6h12v12" />,
    sound: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
    mute: <><path d="m11 4-6 5H2v6h3l6 5V4Z" /><path d="m16 9 6 6m0-6-6 6" /></>,
    rotate: <path d="m6 3-4 4 4 4M2 7h13a6 6 0 0 1 0 12H8" />,
    gravity: <><circle cx="12" cy="6" r="3" /><path d="M12 12v9m-4-4 4 4 4-4M4 22h16" /></>,
    parts: <path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    pause: <path d="M8 5v14M16 5v14" />,
    play: <path d="m8 4 12 8-12 8V4Z" />,
    reset: <path d="M3 10a9 9 0 1 1 1 8M3 4v6h6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function MachineExperience() {
  const host = useRef<HTMLDivElement>(null);
  const machine = useRef<MachineAPI | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundEnabled = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [route, setRoute] = useState<MachineRoute>("bell");
  const [gravity, setGravity] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [count, setCount] = useState(0);
  const [scrub, setScrub] = useState(100);
  const [rewinding, setRewinding] = useState(false);
  const [status, setStatus] = useState("Una cosa lleva a otra.");
  const [panel, setPanel] = useState<Panel>(null);
  const callbacks = useRef<{ onAction: (action: MachineAction) => void; onConsequence: (route: MachineRoute) => void }>({ onAction: () => {}, onConsequence: () => {} });
  const selectedProject = projects.find(project => project.slug === panel);
  const chapter = chapters[Math.min(6, Math.floor(scrub / 100 * 7))];

  const chime = useCallback((kind: "bell" | "flight" | "click") => {
    const context = audio.current;
    if (!soundEnabled.current || !context || context.state !== "running") return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "flight" ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(kind === "bell" ? 1046.5 : kind === "flight" ? 640 : 180, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "bell" ? 1038 : 90, now + 0.3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(kind === "bell" ? 0.07 : 0.035, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(now); oscillator.stop(now + 0.55);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }, []);

  const launch = useCallback(() => {
    if (!machine.current || !ready || exploded || paused || rewinding || panel) return;
    if (machine.current.launch()) {
      setCount(value => value + 1);
      setStatus(gravity ? "Allá va. Sigue la canica." : "La gravedad se ha tomado un descanso.");
      chime("click");
    } else setStatus("Dales un segundo. El circuito está lleno.");
  }, [ready, exploded, paused, rewinding, panel, gravity, chime]);

  useEffect(() => {
    callbacks.current = {
      onAction(action) {
        if (action === "launch") launch();
        else if (action === "route") setRoute(value => value === "bell" ? "flight" : "bell");
        else if (action === "explode") setExploded(value => !value);
        else setPanel(action);
      },
      onConsequence(value) {
        setStatus(value === "bell" ? "Ding. Pequeñas causas, pequeñas consecuencias." : "Próxima parada: donde tú quieras.");
        chime(value);
      },
    };
  }, [launch, chime]);

  useEffect(() => {
    let cancelled = false;
    let instance: MachineAPI | null = null;
    import("./create-machine").then(({ createMachine }) => {
      if (cancelled || !host.current) return;
      instance = createMachine(host.current, {
        onAction: action => callbacks.current.onAction(action),
        onConsequence: value => callbacks.current.onConsequence(value),
        onError: () => { setFailed(true); setReady(false); },
      });
      machine.current = instance;
      setReady(true);
    }).catch(() => { if (!cancelled) { setFailed(true); setReady(false); } });
    return () => { cancelled = true; instance?.dispose(); machine.current = null; };
  }, [attempt]);

  useEffect(() => { machine.current?.setRoute(route); }, [route, ready]);
  useEffect(() => { machine.current?.setGravity(gravity); }, [gravity, ready]);
  useEffect(() => { machine.current?.setExploded(exploded); }, [exploded, ready]);
  useEffect(() => { machine.current?.setPaused(paused || panel !== null); }, [paused, panel, ready]);
  useEffect(() => { machine.current?.setScrub(rewinding ? scrub / 100 : null); }, [scrub, rewinding, ready]);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (panel && !element.open) element.showModal();
    if (!panel && element.open) element.close();
  }, [panel]);
  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash;
      if (hash === "#about" || hash === "#contact") setPanel("about");
      if (hash === "#work") setPanel("work");
      if (hash === "#timeline") setPanel("timeline");
    };
    syncHash(); window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat && event.target === document.body && !panel) {
        event.preventDefault(); launch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launch, panel]);
  useEffect(() => () => { void audio.current?.close(); }, []);

  function closePanel() {
    setPanel(null);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  async function toggleSound() {
    if (sound) { soundEnabled.current = false; setSound(false); return; }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      soundEnabled.current = true; setSound(true); chime("click");
    } catch { setStatus("El sonido no está disponible en este navegador."); }
  }

  return (
    <main className="experience" id="hero">
      <a className="skip-link" href="#machine-controls">Ir a los controles</a>
      <header className="studio-header">
        <a className="studio-brand" href="#hero" aria-label="Carlos Mata, inicio"><span className="brand-mark" aria-hidden="true">c<span>m</span><i /></span><span>CARLOS MATA<span className="brand-sub">OBJETOS & CONSECUENCIAS</span></span></a>
        <nav className="header-nav" aria-label="Portfolio"><button onClick={() => setPanel("work")}>Las piezas <span className="tiny-count">06</span></button><button onClick={() => setPanel("about")}>El autor <Icon name="arrow" size={14} /></button></nav>
        <span className="studio-location"><span className="status-dot" />MADRID, ES</span>
      </header>
      <section className="playground" aria-labelledby="experience-title">
        <div className="intro-row"><div><div className="eyebrow">UN EXPERIMENTO PERSONAL · N.º 001</div><h1 id="experience-title">Por favor, <em>toca.</em><span className="title-dot">●</span></h1></div><p className="intro-note">Soy Carlos. Construyo sistemas.<br />Este está aquí para jugar.</p></div>
        <div className="scene-wrap">
          <div className="scene-corner top-left"><span className="crosshair">+</span><span>LA MÁQUINA DE LAS<br />PEQUEÑAS CONSECUENCIAS</span></div>
          <div className="scene-corner top-right"><span className="serial-number">{String(count).padStart(3, "0")}</span><span>CANICAS LIBERADAS</span></div>
          <div className="machine-host" ref={host} aria-busy={!ready && !failed} />
          {!ready && <div className="scene-message" role="status">{failed ? <><span className="fallback-mark">cm.</span><h2>La máquina necesita un respiro.</h2><p>La vista 3D no ha podido arrancar.<br />Mis proyectos y mi historia siguen aquí.</p><div className="fallback-actions"><button onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Volver a intentar</button><button onClick={() => setPanel("work")}>Ver proyectos <Icon name="arrow" /></button></div></> : <><span className="loading-ring" /><span>Ensamblando pequeñas consecuencias…</span></>}</div>}
          {ready && <div className="scene-bottom"><span className="drag-hint"><Icon name="rotate" size={14} />Arrastra para mirar alrededor</span><div className="camera-controls" aria-label="Cámara"><button aria-label="Girar cámara a la izquierda" onClick={() => machine.current?.rotate(-1)}>←</button><button aria-label="Restablecer cámara" onClick={() => machine.current?.resetView()}><Icon name="reset" size={14} /></button><button aria-label="Girar cámara a la derecha" onClick={() => machine.current?.rotate(1)}>→</button></div></div>}
          {exploded && <div className="assembly-note"><span className="status-dot" />Vista desmontada. Toca una pieza para conocer su historia.</div>}
          {rewinding && <div className="time-caption" aria-live="polite"><span>{chapter.year}</span><strong>{chapter.place}</strong><p>{chapter.text}</p></div>}
        </div>
        <div className="control-desk" id="machine-controls">
          <div className="launch-control"><button className="launch-button" onClick={launch} disabled={!ready || exploded || paused || rewinding} aria-label="Soltar una canica"><span className="launch-arrow">↓</span><span>Suelta una canica</span></button><span className="key-hint">O PULSA <kbd>ESPACIO</kbd></span></div>
          <div className="desk-divider" />
          <div className="route-control"><span className="control-label">01 — EL DESTINO</span><div className="route-switch" role="group" aria-label="Destino de la próxima canica"><button aria-pressed={route === "bell"} disabled={!ready} onClick={() => { setRoute("bell"); chime("click"); }}><span className="route-indicator" />Campana</button><button aria-pressed={route === "flight"} disabled={!ready} onClick={() => { setRoute("flight"); chime("click"); }}><span className="route-indicator" />Vuelo</button></div></div>
          <div className="time-control"><label className="control-label" htmlFor="time-wheel">02 — EL TIEMPO <span>{rewinding ? chapter.year : "AHORA"}</span></label><div className="time-range"><Icon name="rotate" size={16} /><input id="time-wheel" type="range" min="0" max="100" value={scrub} disabled={!ready || exploded} onChange={event => { setScrub(Number(event.target.value)); setRewinding(true); }} aria-label="Rebobinar la máquina y recorrer mi historia" aria-valuetext={rewinding ? `${chapter.year}: ${chapter.place}` : "Presente"} /><span className="time-end">↗</span></div><div className="time-markers"><span>2017</span>{rewinding ? <button onClick={() => { setScrub(100); setRewinding(false); }}>Volver al presente ↗</button> : <span>Rebobina y descubre mi historia</span>}<span>HOY</span></div></div>
        </div>
        <div className="utility-row"><p className="live-status" aria-live="polite"><span className="status-dot" />{exploded ? "Hasta las cosas sencillas tienen algo dentro." : paused ? "El tiempo está en pausa." : status}</p><div className="utility-actions"><button disabled={!ready} aria-pressed={!gravity} onClick={() => { setGravity(value => !value); chime("click"); }}><Icon name="gravity" size={16} /><span>{gravity ? "Gravedad: sí" : "Gravedad: no"}</span></button><button disabled={!ready || rewinding} aria-pressed={exploded} onClick={() => { setExploded(value => !value); chime("click"); }}><Icon name="parts" size={16} /><span>{exploded ? "Volver a montar" : "Desmontar"}</span></button><button disabled={!ready} aria-pressed={paused} aria-label={paused ? "Reanudar máquina" : "Pausar máquina"} onClick={() => setPaused(value => !value)}><Icon name={paused ? "play" : "pause"} size={16} /></button><button aria-pressed={sound} aria-label={sound ? "Desactivar sonido" : "Activar sonido"} onClick={toggleSound}><Icon name={sound ? "sound" : "mute"} size={16} /><span>Sonido {sound ? "on" : "off"}</span></button></div></div>
      </section>
      <footer className="studio-footer"><span className="footer-signature">Hecho por <button onClick={() => setPanel("about")}>Carlos Mata</button><span className="footer-aside">con curiosidad, desde Madrid.</span></span><nav aria-label="Enlaces profesionales"><a href={site.links.github} target="_blank" rel="noopener noreferrer">GitHub <Icon name="arrow" size={13} /></a><a href={site.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Icon name="arrow" size={13} /></a><button onClick={() => setPanel("timeline")}>Mi recorrido <Icon name="arrow" size={13} /></button><a href={`mailto:${site.email}`}>Hablemos <Icon name="arrow" size={13} /></a></nav><span className="footer-colophon">TODO EMPIEZA POR TOCAR ALGO.</span></footer>
      <dialog ref={dialog} className="info-dialog" aria-labelledby="dialog-title" onCancel={closePanel} onClose={() => setPanel(null)} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePanel(); } }}>
        <div className="dialog-top"><span className="eyebrow">CARLOS MATA / DETRÁS DE LA MÁQUINA</span><button className="dialog-close" aria-label="Cerrar información" onClick={closePanel}><Icon name="close" /></button></div>
        {panel === "about" && <div className="dialog-content"><span className="eyebrow accent-text">EL AUTOR</span><h2 id="dialog-title">Hola, soy <em>Carlos.</em></h2><p className="dialog-lead">Me gusta entender cómo funcionan las cosas.<br />Y construir las que todavía no existen.</p><p>Software & Data Engineer en Madrid. Actualmente trabajo en arquitectura de datos en Nfq y soy cofundador de Aksum, una plataforma de conocimiento interno.</p><div className="author-facts"><div><span>EN EL TRABAJO</span><p>Databricks, dbt y Snowflake.</p></div><div><span>EN MIS PROYECTOS</span><p>Node.js, React y Supabase.</p></div></div><div className="dialog-links"><a href={site.links.github} target="_blank" rel="noopener noreferrer">GitHub <Icon name="arrow" /></a><a href={site.links.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn <Icon name="arrow" /></a><a href={`mailto:${site.email}`}>Escríbeme <Icon name="arrow" /></a></div><button className="text-action" onClick={() => setPanel("timeline")}>Unas cuantas paradas hasta aquí <span>→</span></button></div>}
        {panel === "work" && <div className="dialog-content"><span className="eyebrow accent-text">06 PIEZAS / 2023–2026</span><h2 id="dialog-title">Cosas que<br /><em>he construido.</em></h2><p>Datos, vuelos, energía y unas cuantas preguntas convertidas en código.</p><div className="project-list">{projects.map((project, index) => <button key={project.slug} className="project-list-item" onClick={() => setPanel(project.slug)}><span className="project-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{project.title}</strong><small>{project.tags.slice(0, 3).join(" / ")}</small></span><span className="project-year">{project.year}</span><Icon name="arrow" /></button>)}</div></div>}
        {selectedProject && <div className="dialog-content"><button className="back-link" onClick={() => setPanel("work")}>← Todas las piezas</button><span className="eyebrow accent-text">{selectedProject.year} / {selectedProject.role}</span><h2 id="dialog-title" className="project-title">{selectedProject.title}</h2><p className="dialog-lead">{descriptions[selectedProject.slug]}</p><div className="project-tags">{selectedProject.tags.map(tag => <span key={tag}>{tag}</span>)}</div><div className="project-notes"><span className="control-label">EL MECANISMO</span><p>{selectedProject.context}</p></div><div className="dialog-links">{selectedProject.links?.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <Icon name="arrow" /></a>)}</div></div>}
        {panel === "timeline" && <div className="dialog-content"><span className="eyebrow accent-text">DE ALLÍ HASTA AQUÍ</span><h2 id="dialog-title">Nada ocurre<br /><em>en línea recta.</em></h2><ol className="history-list">{timeline.map(item => <li key={`${item.year}-${item.event}`}><span className="history-year">{item.year.replace("Present", "hoy")}</span><div><strong>{"href" in item && item.href ? <a href={item.href} target="_blank" rel="noopener noreferrer">{item.event} ↗</a> : item.event}</strong><p>{item.role}</p></div></li>)}</ol><details className="qualifications"><summary>También por el camino: certificaciones <span>+</span></summary>{certifications.map(cert => <p key={cert.name}>{cert.name}<span>{cert.issuer} · {cert.year}</span></p>)}</details></div>}
        <div className="dialog-bottom"><span>¿Seguimos hablando?</span><a href={`mailto:${site.email}`}>{site.email} <Icon name="arrow" size={14} /></a></div>
      </dialog>
      <noscript><section className="noscript-info"><h2>Carlos Mata — Software & Data Engineer</h2><p>La máquina usa JavaScript. Puedes visitar mis proyectos y mi perfil directamente.</p><a href={site.links.github}>Mis proyectos en GitHub</a><a href={site.links.linkedin}>Mi trayectoria en LinkedIn</a><a href={`mailto:${site.email}`}>Contacto</a></section></noscript>
    </main>
  );
}
