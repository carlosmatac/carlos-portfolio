import Image from "next/image";
import type { ReactNode } from "react";

/** Animated explanatory diagrams for the featured projects. Motion is CSS only, so reduced motion stops it. */

const AKSUM_STAGES: { title: string; text: string; tech: string[]; visual: ReactNode }[] = [
  {
    title: "Capture", text: "Interviews, transcripts, PDFs and notes enter the platform.", tech: ["AssemblyAI", "PDF parsing"],
    visual: (
      <svg viewBox="0 0 160 70" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <rect key={i} className="dg-bar" x={10 + i * 8} y={20} width="4" height="30" rx="2" style={{ animationDelay: `${-i * 0.13}s` }} />)}
        <rect className="dg-doc" x="96" y="12" width="26" height="34" rx="3" /><rect className="dg-doc" x="110" y="22" width="26" height="34" rx="3" />
        {[30, 36, 42].map(y => <line key={y} className="dg-line" x1="115" x2="131" y1={y} y2={y} />)}
      </svg>
    ),
  },
  {
    title: "Connect", text: "People, companies, topics and relationships are extracted and linked, with evidence and confidence.", tech: ["OpenAI extraction", "pgvector", "Knowledge graph"],
    visual: (
      <svg viewBox="0 0 160 70" aria-hidden="true">
        {[[80, 35, 30, 14], [80, 35, 132, 16], [80, 35, 26, 56], [80, 35, 136, 54], [80, 35, 80, 8], [30, 14, 26, 56], [132, 16, 136, 54]].map(([x1, y1, x2, y2], i) =>
          <line key={i} className="dg-edge" x1={x1} y1={y1} x2={x2} y2={y2} style={{ animationDelay: `${-i * 0.4}s` }} />)}
        {[[30, 14], [132, 16], [26, 56], [136, 54], [80, 8]].map(([cx, cy], i) => <circle key={i} className="dg-node" cx={cx} cy={cy} r="5" style={{ animationDelay: `${-i * 0.5}s` }} />)}
        <circle className="dg-hub" cx="80" cy="35" r="9" />
      </svg>
    ),
  },
  {
    title: "Retrieve", text: "A copilot answers from internal sources, walks the graph and searches the web when allowed.", tech: ["Agentic RAG", "Vercel AI SDK", "Tavily"],
    visual: (
      <svg viewBox="0 0 160 70" aria-hidden="true">
        <rect className="dg-bubble" x="14" y="10" width="92" height="22" rx="11" />
        <rect className="dg-bubble dg-bubble-answer" x="48" y="38" width="98" height="24" rx="12" />
        {[0, 1, 2].map(i => <circle key={i} className="dg-typing" cx={34 + i * 10} cy="21" r="2.6" style={{ animationDelay: `${i * 0.18}s` }} />)}
        {[0, 1].map(i => <rect key={i} className="dg-chip" x={60 + i * 38} y="46" width="32" height="8" rx="4" />)}
      </svg>
    ),
  },
  {
    title: "Activate", text: "Knowledge becomes meeting briefs, reports and content, exported and shared.", tech: ["Templated reports", "PDF export"],
    visual: (
      <svg viewBox="0 0 160 70" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <g key={i} className="dg-sheet" style={{ animationDelay: `${-i * 1.1}s`, transformOrigin: "80px 64px" }}>
            <rect x="58" y="8" width="44" height="56" rx="4" />
            <line className="dg-line" x1="66" x2="94" y1="20" y2="20" /><line className="dg-line" x1="66" x2="88" y1="28" y2="28" />
          </g>
        ))}
      </svg>
    ),
  },
];

export function AksumDiagram() {
  return (
    <figure className="diagram diagram-aksum">
      <figcaption>How Aksum works</figcaption>
      <ol className="dg-stages">
        {AKSUM_STAGES.map((stage, index) => (
          <li key={stage.title} className="dg-stage">
            <span className="dg-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="dg-visual">{stage.visual}</div>
            <h4>{stage.title}</h4>
            <p>{stage.text}</p>
            <ul>{stage.tech.map(tech => <li key={tech}>{tech}</li>)}</ul>
          </li>
        ))}
      </ol>
      <p className="dg-review"><span aria-hidden="true">↺</span> Human in the loop between capture and connect: transcript corrections, entity edits, aliases and merges, then safe reprocessing.</p>
    </figure>
  );
}

function Box({ x, y, w, h, title, text, tone = "plain" }: { x: number; y: number; w: number; h: number; title: string; text?: string; tone?: "plain" | "accent" | "human" | "muted" }) {
  return (
    <g className={`dg-box dg-box-${tone}`}>
      <rect x={x} y={y} width={w} height={h} rx="10" />
      <text x={x + 14} y={y + (text ? 22 : h / 2 + 4)} className="dg-title">{title}</text>
      {text && <text x={x + 14} y={y + 39} className="dg-text">{text}</text>}
    </g>
  );
}

const flow = (d: string, slow = false) => <path key={d} className={slow ? "dg-flow dg-flow-slow" : "dg-flow"} d={d} />;

export function ZhivelDiagram() {
  const specialists = [["Spaces", "venues and capacity"], ["Catering", "deliveries and menus"], ["Transport", "shuttles on OSRM routes"], ["Attendees", "staff and guests"]] as const;
  return (
    <figure className="diagram diagram-wide">
      <figcaption>How Zhivel handles a crisis</figcaption>
      <div className="dg-scroll">
        <svg viewBox="0 0 960 380" role="img" aria-label="An incident reaches the coordinator agent, which plans with four specialist agents. They phone, text and email real counterparts through HappyRobot. A deterministic world engine keeps the state, and a human approves or rejects each critical decision.">
          <Box x={16} y={160} w={170} h={60} title="Incident" text="water leak · 600 guests" tone="muted" />
          <Box x={300} y={18} w={200} h={58} title="Human operator" text="approves or rejects" tone="human" />
          <Box x={300} y={152} w={200} h={76} title="Coordinator agent" text="plans, acts, replans on a no" tone="accent" />
          <Box x={300} y={304} w={200} h={58} title="World engine" text="gates, queues, shuttles, clock" tone="muted" />
          {specialists.map(([name, text], i) => <Box key={name} x={590} y={26 + i * 86} w={170} h={58} title={name} text={text} />)}
          <text x={944} y={14} className="dg-label" textAnchor="end">HappyRobot · voice, SMS, email</text>
          {specialists.map((_, i) => (
            <g key={i} transform={`translate(860 ${55 + i * 86})`}>
              <circle className="dg-ring" r="17" style={{ animationDelay: `${-i * 0.7}s` }} />
              <g className="dg-phone"><circle r="17" /><path d="M-6 -6c1.5 4 4.5 7.5 12 12l3-3-4-3-2 2c-2-1-4-3-5-5l2-2-3-4z" /></g>
            </g>
          ))}
          {flow("M186 190 H300")}
          {flow("M380 76 V152")}
          {flow("M420 152 V76", true)}
          {flow("M400 304 V228", true)}
          {specialists.map((_, i) => flow(`M500 190 C545 190 545 ${55 + i * 86} 590 ${55 + i * 86}`))}
          {specialists.map((_, i) => flow(`M760 ${55 + i * 86} H843`))}
        </svg>
      </div>
    </figure>
  );
}

export function ImageryDiagram() {
  return (
    <figure className="diagram diagram-wide">
      <figcaption>The image pipeline</figcaption>
      <div className="dg-scroll">
        <svg viewBox="0 0 960 250" role="img" aria-label="Photos and renders from the old site use the studio's own retouch when it exists, otherwise a Gemini retouch that must keep the real geometry and is reviewed against the original. Plans are never sent to the AI and are upscaled locally. Every result becomes a tagged 1536-pixel web image.">
          <Box x={16} y={40} w={190} h={60} title="Photo or render" text="old site · 800 px" tone="muted" />
          <Box x={16} y={160} w={190} h={60} title="Plan or drawing" text="exact lines and labels" tone="muted" />
          <Box x={270} y={8} w={210} h={58} title="Studio retouch" text="used when it exists" />
          <Box x={270} y={80} w={210} h={58} title="Gemini retouch" text="geometry must not change" tone="accent" />
          <Box x={270} y={160} w={210} h={60} title="Local upscale" text="never sent to the AI" />
          <Box x={540} y={80} w={180} h={58} title="Review" text="against the original" tone="human" />
          <Box x={780} y={80} w={164} h={58} title="Web image" text="1536 px · tagged" tone="accent" />
          {flow("M206 70 C238 70 238 37 270 37")}
          {flow("M206 70 C238 70 238 109 270 109")}
          {flow("M206 190 H270")}
          {flow("M480 109 H540")}
          {flow("M720 109 H780")}
          {flow("M480 37 C640 37 640 92 780 98", true)}
          {flow("M480 190 C640 190 640 126 780 120", true)}
          <text x={846} y={170} className="dg-label" textAnchor="middle">retouched · ai · local</text>
        </svg>
      </div>
    </figure>
  );
}

const BOIL = "/images/work/diego-prados/line-boil";
/** Exposure order of the line boil, as on diegoprados.com: three drawings at 6 per second. */
const BOIL_ORDER = [1, 2, 3, 2];
const BOIL_OBJECTS = [
  { id: "tierra", label: "Earth · Profile", width: 480, height: 488 },
  { id: "microfono", label: "Microphone · AUGE", width: 480, height: 660 },
  { id: "microchip", label: "Microchip · Thesis", width: 480, height: 390 },
] as const;

const BOIL_STEPS = [
  { title: "Draw", text: "Each object and pose is drawn again from one style reference, on the same canvas. The movement is the difference between drawings.", tech: ["Codex image generation", "Style reference"] },
  { title: "Clean", text: "Paper becomes transparency: darkness turns into the alpha of a warm charcoal ink. One crop box per object keeps the strokes in register.", tech: ["Python", "Pillow", "WebP with alpha"] },
  { title: "Register", text: "For the contact door, a manifest stores each drawing's sole and palm lines, so the panel's edge follows Diego's hands on one clock.", tech: ["Manifest", "soleY · contactY"] },
  { title: "Play", text: "Six drawings per second, 01, 02, 03, 02, with no interpolation. Only sketches in view move; reduced motion keeps the first drawing.", tech: ["IntersectionObserver", "Reduced motion"] },
];

export function LineBoilDiagram() {
  return (
    <figure className="diagram diagram-boil">
      <figcaption>How the pencil moves</figcaption>
      <div className="boil-paper">
        <div className="boil-live">
          {BOIL_OBJECTS.map(object => (
            <div key={object.id} className="boil-object">
              <div className="boil" style={{ aspectRatio: `${object.width} / ${object.height}` }} aria-hidden="true">
                {[1, 2, 3].map(n => <Image key={n} src={`${BOIL}/${object.id}/${n}.webp`} alt="" width={object.width} height={object.height} unoptimized />)}
              </div>
              <span>{object.label}</span>
            </div>
          ))}
        </div>
        <div>
          <ol className="boil-strip" aria-label="The four exposures of one loop: drawings 01, 02, 03 and 02 again">
            {BOIL_ORDER.map((n, i) => (
              <li key={i} style={{ animationDelay: `${i / 6}s` }}>
                <Image src={`${BOIL}/microchip/${n}.webp`} alt="" width={480} height={390} unoptimized />
                <span>{String(n).padStart(2, "0")}</span>
              </li>
            ))}
          </ol>
          <p className="boil-note">One loop: four exposures at 6 per second</p>
        </div>
      </div>
      <ol className="dg-stages boil-stages">
        {BOIL_STEPS.map((step, index) => (
          <li key={step.title} className="dg-stage">
            <span className="dg-index">{String(index + 1).padStart(2, "0")}</span>
            <h4>{step.title}</h4>
            <p>{step.text}</p>
            <ul>{step.tech.map(tech => <li key={tech}>{tech}</li>)}</ul>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export const DIAGRAMS = { aksum: AksumDiagram, zhivel: ZhivelDiagram, imagery: ImageryDiagram, lineboil: LineBoilDiagram };
