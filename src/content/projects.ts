export type CaseStudyLink = { label: string; href: string };

export type CaseStudy = {
  slug: string;
  title: string;
  oneLiner: string;
  tags: string[];
  thumb?: string;

  // Case-study metadata
  year: string;
  role: string;
  status?: "Concept" | "Prototype" | "Shipped";
  duration?: string;

  // Content blocks
  context: string;
  problem: string[];
  approach: string[];
  outcome: string[];

  highlights?: string[];
  links?: CaseStudyLink[];
  gallery?: string[]; // public/ paths, optional
};

export const projects: CaseStudy[] = [
  {
    slug: "project-aura",
    title: "PROJECT AURA",
    oneLiner: "Autonomous navigation system architecture",
    tags: ["ROS2", "C++", "Qt"],
    thumb: "",

    year: "2025",
    role: "Systems / Software",
    status: "Prototype",
    duration: "6–8 weeks",

    context:
      "A concept project exploring a clean architecture for autonomous mission execution, with a focus on reliability, observability, and operator UX.",
    problem: [
      "Complex mission logic becomes hard to test and reason about.",
      "Systems need predictable performance and failure handling.",
      "Operator tooling often lags behind the backend architecture.",
    ],
    approach: [
      "Defined a modular architecture (interfaces + small components) to isolate mission logic from transport details.",
      "Outlined a telemetry and logging strategy designed for debugging under time pressure.",
      "Designed a minimal UI to surface only the information that matters in operation.",
    ],
    outcome: [
      "A documented architecture with clear boundaries and extension points.",
      "A prototype plan for metrics/telemetry that supports later production hardening.",
      "A UI direction that matches the “editorial” style of this site (simple, readable, consistent).",
    ],
    highlights: ["Clean module boundaries", "Failure-aware design", "Operator-centric UI"],
    links: [{ label: "Read more (placeholder)", href: "#" }],
    gallery: [],
  },

  {
    slug: "synapse-data",
    title: "SYNAPSE DATA",
    oneLiner: "Scalable real-time data platform",
    tags: ["Python", "Kafka", "AWS"],
    thumb: "",

    year: "2026",
    role: "Data Architecture",
    status: "Concept",
    duration: "Ongoing",

    context:
      "A placeholder case study to demonstrate how I would present a data platform project: ingestion, modeling, quality, and serving.",
    problem: [
      "Data arrives from multiple sources with inconsistent schemas.",
      "Teams need trustworthy datasets without constant manual fixes.",
      "Latency and cost must be controlled from day one.",
    ],
    approach: [
      "Defined contracts (schemas + versioning) and a simple governance model.",
      "Designed a pipeline with clear stages: ingest → validate → transform → serve.",
      "Added quality checks and observability as first-class requirements.",
    ],
    outcome: [
      "A clear blueprint for a production-ready platform.",
      "A structure that scales with more sources and more consumers.",
      "A portfolio-ready narrative that communicates decisions, not buzzwords.",
    ],
    highlights: ["Schema discipline", "Quality gates", "Cost-aware design"],
    links: [{ label: "Architecture notes (placeholder)", href: "#" }],
    gallery: [],
  },

  {
    slug: "quantum-edge",
    title: "QUANTUM EDGE",
    oneLiner: "High-frequency trading interface",
    tags: ["C++", "Linux", "UI/UX"],
    thumb: "",

    year: "2025",
    role: "Frontend / Systems",
    status: "Concept",
    duration: "2–3 weeks",

    context:
      "A placeholder concept for a performance-sensitive interface. The intent is to show how I think about UX under constraints.",
    problem: [
      "Operators need fast, stable UI feedback under load.",
      "Too much data creates noise and slows decision-making.",
      "Systems must remain predictable as complexity grows.",
    ],
    approach: [
      "Designed a UI that prioritizes hierarchy, legibility, and shortcuts over decoration.",
      "Outlined performance constraints and a rendering strategy.",
      "Created a simple component system to keep the UI consistent.",
    ],
    outcome: [
      "A spec-like case study with UX decisions and performance considerations.",
      "A reusable design pattern library (minimal components, clear spacing).",
      "A format that can be reused for real projects later.",
    ],
    highlights: ["UX under constraints", "Performance-first mindset", "Minimal component system"],
    links: [{ label: "Spec draft (placeholder)", href: "#" }],
    gallery: [],
  },
];
