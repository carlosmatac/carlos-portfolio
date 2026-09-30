"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { CaseStudy, ProjectMedia } from "@/content/projects";

/** Drawn placeholder previews, used until a project has real imagery. */
const mono = "var(--font-geist-mono), ui-monospace, monospace";

function Retail() {
  const columns = [[40, 70, 100, 130], [70, 110], [90]];
  return (
    <svg viewBox="0 0 300 196" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="retail-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0f1d3a" /><stop offset="1" stopColor="#060b18" /></linearGradient></defs>
      <rect width="300" height="196" fill="url(#retail-bg)" />
      {columns[0].map(y => <path key={y} d={`M58 ${y} C84 ${y} 84 ${y < 90 ? 70 : 110} 110 ${y < 90 ? 70 : 110}`} stroke="#3b5aa8" fill="none" />)}
      {columns[1].map(y => <path key={y} d={`M158 ${y} C176 ${y} 176 90 194 90`} stroke="#3b5aa8" fill="none" />)}
      {columns[0].map((y, i) => <g key={y}><rect x="16" y={y - 8} width="42" height="16" rx="4" fill="#15254a" stroke="#4f74d6" /><text x="37" y={y + 3} fill="#9fb6f5" fontSize="6.5" fontFamily={mono} textAnchor="middle">{["pos", "crm", "erp", "web"][i]}</text></g>)}
      {columns[1].map((y, i) => <g key={y}><rect x="110" y={y - 9} width="48" height="18" rx="4" fill="#123a3a" stroke="#58d6c2" /><text x="134" y={y + 3} fill="#9ff0e2" fontSize="6.5" fontFamily={mono} textAnchor="middle">{["stg_orders", "stg_stock"][i]}</text></g>)}
      <rect x="194" y="79" width="50" height="22" rx="5" fill="#2b2250" stroke="#a48cff" /><text x="219" y="93" fill="#d4c8ff" fontSize="6.5" fontFamily={mono} textAnchor="middle">fct_sales</text>
      {[34, 52, 28, 64, 46, 72].map((h, i) => <rect key={i} x={196 + i * 14} y={176 - h} width="9" height={h} rx="2" fill={i === 5 ? "#a48cff" : "#3b5aa8"} opacity={0.5 + i * 0.08} />)}
      <text x="16" y="22" fill="#6f86c9" fontSize="7" fontFamily={mono} letterSpacing="1.5">DBT · SNOWFLAKE</text>
    </svg>
  );
}

function Energy() {
  const prices = [62, 58, 55, 57, 70, 96, 118, 104, 88, 79, 74, 81, 99, 132, 141, 120, 95, 84];
  const points = prices.map((p, i) => `${18 + i * 12.6},${150 - p * 0.72}`).join(" ");
  return (
    <svg viewBox="0 0 250 166" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="energy-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b1208" /><stop offset="1" stopColor="#0a0705" /></linearGradient>
        <linearGradient id="energy-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f5a524" stopOpacity=".45" /><stop offset="1" stopColor="#f5a524" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width="250" height="166" fill="url(#energy-bg)" />
      {[50, 80, 110, 140].map(y => <line key={y} x1="18" x2="232" y1={y} y2={y} stroke="#ffffff10" />)}
      <polygon points={`18,150 ${points} 232,150`} fill="url(#energy-area)" />
      <polyline points={points} fill="none" stroke="#f5a524" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx={18 + 14 * 12.6} cy={150 - 141 * 0.72} r="3" fill="#ffd68a" />
      <text x="18" y="24" fill="#f5c67a" fontSize="7" fontFamily={mono} letterSpacing="1.5">OMIE · €/MWh</text>
      <text x="232" y="24" fill="#ffd68a" fontSize="11" fontFamily={mono} textAnchor="end">141.2</text>
    </svg>
  );
}

function Flights() {
  const hub = [120, 92];
  const cities: [number, number, string][] = [[186, 62, "BCN"], [92, 44, "BIO"], [84, 140, "SVQ"], [128, 150, "AGP"], [176, 106, "VLC"], [226, 112, "PMI"], [40, 56, "SCQ"]];
  return (
    <svg viewBox="0 0 280 182" preserveAspectRatio="xMidYMid slice">
      <rect width="280" height="182" fill="#06122a" />
      {Array.from({ length: 14 }, (_, x) => Array.from({ length: 9 }, (_, y) => <circle key={`${x}-${y}`} cx={12 + x * 20} cy={12 + y * 20} r=".7" fill="#ffffff22" />))}
      {cities.map(([x, y]) => <path key={x} d={`M${hub[0]} ${hub[1]} Q${(hub[0] + x) / 2} ${Math.min(hub[1], y) - 26} ${x} ${y}`} fill="none" stroke="#4ea1ff" strokeOpacity=".7" strokeDasharray="3 3" />)}
      {cities.map(([x, y, code]) => <g key={code}><circle cx={x} cy={y} r="2.6" fill="#8cc4ff" /><text x={x} y={y - 6} fill="#8cc4ff" fontSize="6" fontFamily={mono} textAnchor="middle">{code}</text></g>)}
      <circle cx={hub[0]} cy={hub[1]} r="5" fill="#ffd166" /><circle cx={hub[0]} cy={hub[1]} r="11" fill="none" stroke="#ffd166" strokeOpacity=".4" />
      <rect x="160" y="140" width="108" height="30" rx="5" fill="#0b1d3f" stroke="#1f3d73" />
      <text x="168" y="153" fill="#ffd166" fontSize="7" fontFamily={mono}>MAD → BCN  06:45</text>
      <text x="168" y="164" fill="#6f92c9" fontSize="6" fontFamily={mono}>3 providers · 1.4 s</text>
    </svg>
  );
}

function Beer() {
  return (
    <svg viewBox="0 0 210 262" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="beer-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#231606" /><stop offset="1" stopColor="#0d0803" /></linearGradient>
        <linearGradient id="beer-liquid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f7b733" /><stop offset="1" stopColor="#c46a12" /></linearGradient>
      </defs>
      <rect width="210" height="262" fill="url(#beer-bg)" />
      <path d="M70 70 h70 l-8 104 a8 8 0 0 1 -8 7 h-38 a8 8 0 0 1 -8 -7 Z" fill="url(#beer-liquid)" />
      {[[74, 66, 12], [92, 62, 14], [112, 63, 13], [130, 67, 11]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill="#fff4dc" />)}
      {[[92, 120], [110, 140], [100, 158], [118, 104]].map(([cx, cy]) => <circle key={cx + cy} cx={cx} cy={cy} r="2" fill="#ffe3a3" opacity=".7" />)}
      {[0, 1, 2, 3, 4].map(i => <path key={i} transform={`translate(${57 + i * 20} 204)`} d="M8 0l2.4 5 5.6.8-4 3.9.9 5.5L8 12.6 3.1 15.2 4 9.7 0 5.8l5.6-.8z" fill={i < 4 ? "#f7b733" : "#4a3515"} />)}
      <text x="105" y="240" fill="#e0b870" fontSize="7" fontFamily={mono} textAnchor="middle" letterSpacing="1.5">HAZY IPA · 6.2%</text>
      <text x="105" y="30" fill="#8a6a36" fontSize="7" fontFamily={mono} textAnchor="middle" letterSpacing="2">BEERSP</text>
    </svg>
  );
}

function Chrono() {
  return (
    <svg viewBox="0 0 236 158" preserveAspectRatio="xMidYMid slice">
      <defs><filter id="chrono-glow"><feGaussianBlur stdDeviation="2.2" /></filter></defs>
      <rect width="236" height="158" fill="#04130b" />
      {["M0 20 H60 L80 40 H140", "M236 30 H190 L170 50", "M0 130 H50 L70 110 H110", "M236 140 H170 L150 120 H130", "M118 0 V26"].map(d => <path key={d} d={d} stroke="#1f6b43" strokeWidth="2" fill="none" />)}
      {[[140, 40], [170, 50], [110, 110], [130, 120]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="3.5" fill="#04130b" stroke="#c9a54a" strokeWidth="1.5" />)}
      <rect x="28" y="54" width="180" height="50" rx="6" fill="#0a0707" stroke="#2a1a1a" />
      <g fontFamily={mono} fontSize="30" textAnchor="middle" fill="#ff4d4d">
        <text x="118" y="90" filter="url(#chrono-glow)" opacity=".8">12:48.07</text>
        <text x="118" y="90">12:48.07</text>
      </g>
      <text x="28" y="150" fill="#4f9b73" fontSize="6.5" fontFamily={mono} letterSpacing="1.5">ATMEGA328P · ISR 1 kHz</text>
    </svg>
  );
}

function Solver() {
  const levels = [[130], [60, 130, 200], [30, 80, 115, 150, 185, 225]];
  const rows = [40, 92, 146];
  const path = [[130, 40], [130, 92], [150, 146]];
  return (
    <svg viewBox="0 0 260 196" preserveAspectRatio="xMidYMid slice">
      <rect width="260" height="196" fill="#0f0a1f" />
      {levels[1].map(x => <line key={x} x1="130" y1="40" x2={x} y2="92" stroke="#3a2d66" />)}
      {levels[2].map((x, i) => <line key={x} x1={levels[1][Math.floor(i / 2)]} y1="92" x2={x} y2="146" stroke="#3a2d66" />)}
      <polyline points={path.map(p => p.join(",")).join(" ")} fill="none" stroke="#b69cff" strokeWidth="2" />
      {levels.flatMap((row, level) => row.map(x => {
        const y = rows[level], on = path.some(([px, py]) => px === x && py === y);
        return <circle key={`${level}-${x}`} cx={x} cy={y} r={level ? 7 : 9} fill={on ? "#b69cff" : "#1c1438"} stroke="#6a55b8" />;
      }))}
      <text x="18" y="178" fill="#8f7fd1" fontSize="7" fontFamily={mono}>952 = (75 + 25) × 9 + 52</text>
      <text x="242" y="178" fill="#d9ccff" fontSize="7" fontFamily={mono} textAnchor="end">8 ms</text>
      <text x="18" y="20" fill="#6a55b8" fontSize="7" fontFamily={mono} letterSpacing="1.5">BFS · PRUNED</text>
    </svg>
  );
}

function Generic({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 240 160" preserveAspectRatio="xMidYMid slice">
      <rect width="240" height="160" fill="#0b0e16" />
      <text x="120" y="84" fill="#9aa6b8" fontSize="12" textAnchor="middle">{title}</text>
    </svg>
  );
}

const ART: Record<string, () => React.JSX.Element> = {
  "retail-analytics-platform": Retail,
  "energy-market-integrator": Energy,
  "flysmart-spain": Flights,
  beersp: Beer,
  "embedded-stopwatch": Chrono,
  "numbers-letters-solver": Solver,
};

/** On the board a video is a silent loop; it stays on its poster when motion is reduced. */
function LoopVideo({ media }: { media: Extract<ProjectMedia, { kind: "video" }> }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current!, reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { if (reduced.matches) element.pause(); else element.play()?.catch(() => {}); };
    sync();
    reduced.addEventListener("change", sync);
    return () => reduced.removeEventListener("change", sync);
  }, []);
  return <video ref={video} src={media.src} poster={media.poster} muted loop playsInline preload="metadata" />;
}

export default function ProjectArt({ project, detail = false }: { project: CaseStudy; detail?: boolean }) {
  const { media } = project;
  if (media?.kind === "image") {
    return (
      <div className="project-art" data-media="image">
        <Image src={media.src} alt={detail ? media.alt : ""} fill sizes={detail ? "420px" : "(max-width: 640px) 90vw, 460px"} unoptimized />
      </div>
    );
  }
  if (media?.kind === "video") {
    return (
      <div className="project-art" data-media="video">
        {detail
          ? <video src={media.src} poster={media.poster} controls playsInline preload="metadata" aria-label={media.alt} />
          : <LoopVideo media={media} />}
      </div>
    );
  }
  const Art = ART[project.slug];
  return <div className="project-art" aria-hidden="true">{Art ? <Art /> : <Generic title={project.title} />}</div>;
}
