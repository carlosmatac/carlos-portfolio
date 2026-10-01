export type CaseStudyLink = { label: string; href: string };

/** Three colours for the blurred, grainy backdrop of the project's card and window. */
export type ProjectPalette = readonly [string, string, string];

export type ShowcaseImage = { src: string; alt: string; caption: string; width: number; height: number };

/** Extra material for the largest projects: a diagram, key figures, a gallery and a before/after. */
export type ProjectShowcase = {
  diagram?: "aksum" | "zhivel" | "imagery";
  facts?: { value: string; label: string }[];
  gallery?: ShowcaseImage[];
  compare?: { before: string; after: string; alt: string; caption: string; width: number; height: number };
};

export const DEFAULT_PALETTE: ProjectPalette = ["#5b6cff", "#e5d3ae", "#141a2e"];

/** Real imagery for a project; projects without it use a drawn placeholder. */
export type ProjectMedia =
  | { kind: "image"; src: string; alt: string; width: number; height: number }
  | { kind: "video"; src: string; poster: string; alt: string; width: number; height: number };

export type CaseStudy = {
  slug: string;
  title: string;
  oneLiner: string;
  tags: string[];
  thumb?: string;

  // Case-study metadata
  year: string;
  role: string;
  status?: "Concept" | "Prototype" | "Shipped" | "MVP" | "In progress";
  duration?: string;
  /** The largest recent projects: shown bigger and first on the work board. */
  featured?: boolean;
  media?: ProjectMedia;
  palette?: ProjectPalette;
  showcase?: ProjectShowcase;

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
    slug: "aksum",
    palette: ["#6d5bd0", "#c49a6c", "#222a52"],
    title: "Aksum",
    oneLiner: "Internal knowledge platform that puts what an organisation knows to work",
    tags: ["Next.js", "TypeScript", "Supabase", "pgvector", "OpenAI", "AssemblyAI"],
    year: "2026",
    role: "Co-founder",
    status: "Shipped",
    duration: "Since Feb 2026",
    featured: true,
    media: { kind: "image", src: "/images/work/aksum.webp", alt: "The aksum.ai home page: “What your organisation knows, finally put to work”", width: 1280, height: 800 },
    showcase: {
      diagram: "aksum",
      gallery: [
        { src: "/images/work/aksum/capture.webp", alt: "Interview audio, PDFs, meeting notes and emails flowing into Aksum and coming out as people, companies, topics and sources", caption: "Capture: sources become structured knowledge", width: 768, height: 508 },
        { src: "/images/work/aksum/meeting.webp", alt: "A meeting brief for Meridian Capital with the contact, prior conversations, open opportunities and next follow-up", caption: "Prepare: a brief before every meeting", width: 836, height: 552 },
        { src: "/images/work/aksum/activate.webp", alt: "A market report, social post, executive brief and newsletter generated from internal knowledge", caption: "Activate: reports and content grounded in your sources", width: 806, height: 538 },
        { src: "/images/work/aksum/graph.webp", alt: "The knowledge graph linking people, organisations, documents, events, projects and topics", caption: "The knowledge graph behind every answer", width: 1280, height: 720 },
      ],
    },

    context:
      "Aksum turns interviews, transcripts, documents and conversations into structured knowledge that sales, strategy and communication teams can reuse. Built for media, consulting and research teams working in emerging markets, it prepares meeting briefs, answers questions grounded in the organisation's own sources and drafts reports.",
    problem: [
      "Critical knowledge is scattered across recordings, PDFs, notes and people's memories.",
      "Generic chat assistants answer without the organisation's own sources, people or relationships.",
      "Extracted information has to be trustworthy before it reaches a client.",
    ],
    approach: [
      "Ingestion pipeline for audio and documents: transcription (AssemblyAI), extraction, chunking, embeddings and grounding.",
      "Knowledge graph of people, companies, topics and relationships, with evidence and confidence, on PostgreSQL and pgvector.",
      "Agentic RAG copilot that combines hybrid internal retrieval, graph-traversal tools and optional web search (Vercel AI SDK, OpenAI).",
      "Human-in-the-loop review: transcript corrections, entity editing, aliases and merges, with safe reprocessing.",
    ],
    outcome: [
      "Meeting briefs, grounded answers and templated reports with PDF export and sharing.",
      "Multi-tenant workspaces with roles, invitations and row-level security on Supabase.",
      "Live product at aksum.ai.",
    ],
    highlights: ["Knowledge Graph", "Agentic RAG", "Human-in-the-loop"],
    links: [
      { label: "Visit aksum.ai", href: "https://www.aksum.ai/" },
      { label: "GitHub Repo", href: "https://github.com/carlosmatac/sovereign-data" },
    ],
    gallery: [],
  },

  {
    slug: "zhivel",
    palette: ["#2f8a8f", "#e0a24a", "#1b2442"],
    title: "Zhivel",
    oneLiner: "Agentic operations centre that manages a live crisis — HackSpain 2026",
    tags: ["TypeScript", "React", "Express", "HappyRobot", "LLM agents", "SQLite"],
    year: "2026",
    role: "Frontend & product · team of 5",
    status: "Prototype",
    duration: "36-hour hackathon",
    featured: true,
    media: { kind: "video", src: "/videos/zhivel.mp4", poster: "/images/work/zhivel-poster.webp", alt: "Zhivel demo video", width: 1024, height: 576 },
    showcase: {
      diagram: "zhivel",
      facts: [
        { value: "36 h", label: "from idea to working demo" },
        { value: "5", label: "people in the team" },
        { value: "4", label: "specialist agents on the phone" },
        { value: "600", label: "guests to relocate in 45 minutes" },
      ],
      gallery: [
        { src: "/images/work/zhivel/panel-general.webp", alt: "Operations centre: live map of MADRING with gate queues, the venue status, active incidents and the timeline of agent updates", caption: "The operations centre during the crisis", width: 1280, height: 800 },
        { src: "/images/work/zhivel/panel-decision.webp", alt: "A pending decision card with approve and reject buttons next to the live map", caption: "Every critical decision waits for a human", width: 1280, height: 800 },
        { src: "/images/work/zhivel/panel-movil.webp", alt: "The timeline of incidents on a phone", caption: "The same timeline on a phone", width: 390, height: 844 },
      ],
    },

    context:
      "Built in 36 hours by a team of five for the HappyRobot track of HackSpain 2026 (UPM–ETSIT): “Can AI manage a crisis?”. On a Grand Prix Sunday at MADRING, a water leak closes the main pavilion 45 minutes before opening, with 600 guests on their way. Zhivel's agents replan spaces, catering, shuttles and staff, and pick up the phone to negotiate the new plan.",
    problem: [
      "Six hundred guests without a venue, 45 minutes before opening.",
      "Spaces, catering, transport and staff all depend on each other, and the north and south sites are not connected inside.",
      "Suppliers can say no, so every plan must survive being rejected.",
    ],
    approach: [
      "A coordinator agent proposes plans, executes actions and replans with every new fact; when a counterpart says no, the plan changes.",
      "Four specialist agents (spaces, catering, transport, attendees) negotiate through real voice calls, SMS and email on the HappyRobot platform.",
      "A deterministic world engine: gates with capacity and queues, shuttles on OSRM routes, deliveries, incidents and an accelerable clock.",
      "I worked mainly on the operations panel: the live map of MADRING, the agents panel and the timeline, where a human approves or rejects each decision.",
    ],
    outcome: [
      "A working demo you can phone, deployed on Vercel (frontend) and Railway (backend).",
      "The human stays in command: critical decisions wait for approval.",
      "Persistent state with a transactional queue and idempotent callbacks.",
    ],
    highlights: ["AI Agents", "Voice Calls", "Real-time Operations"],
    links: [
      { label: "Live demo", href: "https://zhivel.vercel.app/" },
      { label: "GitHub Repo", href: "https://github.com/pdsdm/hackspain" },
    ],
    gallery: [],
  },

  {
    slug: "andres-mata-arquitectura",
    palette: ["#b4543a", "#d8c3a5", "#2f2a26"],
    title: "Andrés Mata Arquitectura",
    oneLiner: "Website for an architecture studio in Granada, working since 1993",
    tags: ["React 19", "Vite", "Tailwind v4", "Motion", "Gemini API", "Vercel"],
    year: "2026",
    role: "Design & development",
    status: "In progress",
    featured: true,
    media: { kind: "image", src: "/images/work/andres-mata-arquitectura.webp", alt: "The studio's home page: “Arquitectura que nace del lugar”, beside an animated grid of reference buildings", width: 1280, height: 800 },
    showcase: {
      diagram: "imagery",
      facts: [
        { value: "1993", label: "the studio's first year" },
        { value: "17", label: "municipalities with built work" },
        { value: "47", label: "source images upgraded for the web" },
      ],
      compare: {
        before: "/images/work/andres-mata-arquitectura/elvira-before.webp",
        after: "/images/work/andres-mata-arquitectura/elvira-after.webp",
        alt: "A residential building on calle Elvira, Granada",
        caption: "The same photo before and after the image pipeline: light and colour change, the building's geometry does not.",
        width: 1200, height: 800,
      },
      gallery: [
        { src: "/images/work/andres-mata-arquitectura/estudio.webp", alt: "The studio section: a portrait of the architect next to “33 años haciendo arquitectura en Granada”", caption: "The studio, in its own words", width: 1280, height: 800 },
        { src: "/images/work/andres-mata-arquitectura/obra.webp", alt: "A horizontal carousel of selected work: a holiday home with a pool and a multi-purpose building in Motril", caption: "Selected work, one project at a time", width: 1280, height: 800 },
        { src: "/images/work/andres-mata-arquitectura/territorio.webp", alt: "An engraved dark map of the province of Granada, from Sierra Nevada to the Mediterranean, with the studio's projects", caption: "The territory map, from the Mulhacén to the Mediterranean", width: 1280, height: 800 },
      ],
    },

    context:
      "A new website for an architecture studio that has worked in Granada since 1993, from village houses in the Alpujarra to housing blocks and hotels. The design language sits between whitewash and concrete, and every decision serves the real buildings.",
    problem: [
      "Decades of work lived on an outdated site, with low-resolution photos and old renders.",
      "Technical drawings and plans had to stay exact; any image improvement could not invent geometry.",
      "The studio's roots in the territory of Granada were not visible anywhere.",
    ],
    approach: [
      "An animated modular grid in the hero: tangent curves, arcades and dimension lines draw and erase themselves, revealing reference buildings one cell at a time.",
      "An image pipeline for the old photos: the studio's own retouches when available, otherwise Gemini retouching that must preserve the real building geometry. Plans are never sent to the AI.",
      "An engraved map of the province that places every project from its coordinates, with an affine fit and residual correction.",
      "Smooth scrolling, scroll-spy navigation and a hand-drawn “line boil” footer animation.",
    ],
    outcome: [
      "One source of truth for projects feeding both the interface and the image pipeline.",
      "Deployed on Vercel behind a private preview until launch.",
    ],
    highlights: ["Art Direction", "Image Pipeline", "Interactive Map"],
    links: [
      { label: "GitHub Repo", href: "https://github.com/carlosmatac/arquitecture-web" },
    ],
    gallery: [],
  },

  {
    slug: "retail-analytics-platform",
    palette: ["#4a6cf0", "#8a5cf6", "#101a3a"],
    title: "Retail Analytics Data Platform",
    oneLiner: "Scalable data platform for retail intelligence",
    tags: ["dbt", "Snowflake", "SQL", "Python"],
    thumb: "",

    year: "2026",
    role: "Data Architect",
    status: "Shipped",
    duration: "Ongoing",

    context:
      "Design and implementation of an analytics platform for the retail sector. The project focuses on scalable data ingestion, transformation and modelling, creating optimised data marts for business intelligence and reporting.",
    problem: [
      "Disparate data sources across multiple retail systems with no unified layer.",
      "Raw data not suited for BI tools without heavy preprocessing.",
      "No versioned, testable transformation logic in place.",
    ],
    approach: [
      "Modelled data using dbt with staging, intermediate and mart layers following best practices.",
      "Leveraged Snowflake's warehousing capabilities for scalable compute and storage separation.",
      "Wrote Python scripts for initial data ingestion and orchestration.",
    ],
    outcome: [
      "Reusable data marts powering dashboards and ad-hoc reporting.",
      "Fully tested and documented dbt models with CI checks.",
      "Significant reduction in time-to-insight for business stakeholders.",
    ],
    highlights: ["dbt", "Data Modelling", "Snowflake"],
    links: [
      { label: "GitHub Repo", href: "https://github.com/carlosmatac/dbt-snowflake-retail-analytics" },
    ],
    gallery: [],
  },

  {
    slug: "energy-market-integrator",
    palette: ["#f5a524", "#c2410c", "#2a170a"],
    title: "Energy Market Integrator",
    oneLiner: "Automated data integration for electricity market APIs",
    tags: ["Python", "Pandas", "REST APIs", "PostgreSQL", "Docker", "Grafana"],
    thumb: "",

    year: "2025",
    role: "Data Engineer",
    status: "Shipped",
    duration: "3 months",

    context:
      "Automated data integration system for the energy market. Extracts, cleans and consolidates complex data from multiple sources (electricity market APIs) for subsequent analysis and centralised storage.",
    problem: [
      "Electricity market APIs return inconsistent formats and vary by provider.",
      "Manual data consolidation was error-prone and time-consuming.",
      "No operational visibility into pipeline health or data freshness.",
    ],
    approach: [
      "Built a modular Python ETL pipeline with Pandas for transformation and normalisation.",
      "Containerised the entire stack with Docker for reproducibility.",
      "Connected PostgreSQL as the central store and Grafana for pipeline monitoring.",
    ],
    outcome: [
      "Fully automated daily ingestion from multiple market APIs.",
      "Operational dashboards in Grafana showing data freshness and pipeline KPIs.",
      "Clean, queryable dataset ready for downstream analytics.",
    ],
    highlights: ["ETL Pipeline", "Containerised", "Market Data"],
    links: [
      { label: "GitHub Repo", href: "https://github.com/carlosmatac/energy-market-integrator" },
    ],
    gallery: [],
  },

  {
    slug: "flysmart-spain",
    palette: ["#3a8dff", "#ffd166", "#0c1d40"],
    title: "FlySmart Spain",

    oneLiner: "Real-time flight aggregation platform",
    tags: ["Java / Spring", "Python", "React", "Selenium"],
    thumb: "",

    year: "2024",
    role: "Lead Architect",
    status: "Shipped",
    duration: "4 months",

    context:
      "A specialized flight comparison engine for the Spanish market. Unlike generic aggregators, it focuses on domestic connectivity, integrating real-time data from official APIs and custom scrapers.",
    problem: [
      "Fragmented data sources: Airlines use different protocols and guard their data aggressively.",
      "Latency requirements: Users expect search results in under 2 seconds, but scrapers are inherently slow.",
      "Data consistency: Merging structured API responses with unstructured HTML scrapes is error-prone.",
    ],
    approach: [
      "Designed a hybrid persistence layer: High-speed caching (Redis) for hot routes and persistent storage (MySQL) for historical trends.",
      "implemented a distributed scraping architecture using Python/Selenium with autonomous error recovery.",
      "Built a modern, responsive frontend in React that consumes a unified Spring Boot REST API.",
    ],
    outcome: [
      "Successfully handles concurrent queries across multiple providers.",
      "Normalized data schema allowing for future expansion into other transport modes.",
      "Zero-downtime scraper deployment pipeline.",
    ],
    highlights: ["Distributed Scraping", "Hybrid Architecture", "Real-time Data"],
    links: [
      { label: "Frontend Repo", href: "https://github.com/FlySmartProject/FlySmartSpainFrontEnd" },
      { label: "Backend Repo", href: "https://github.com/FlySmartProject/FlySmartSpainBackend" },
    ],
    gallery: [],
  },

  {
    slug: "beersp",
    palette: ["#f7b733", "#a3611a", "#24170a"],
    title: "BeerSp",
    oneLiner: "Social craft beer catalog & discovery",
    tags: ["Spring Boot", "Kotlin", "React", "MySQL"],
    thumb: "",

    year: "2024",
    role: "Full Stack Engineer",
    status: "MVP",
    duration: "3 months",

    context:
      "A community-driven platform for craft beer enthusiasts to catalog, rate, and discover local breweries. Built to focus on social interaction and reliable data structure.",
    problem: [
      "Need for relationships between Users, Beers, Breweries, and Reviews with strict integrity.",
      "Scalability of the catalog as user-generated content grows.",
      "Requirement for a clean, modile-first interface for on-the-go logging.",
    ],
    approach: [
      "Architected a robust relational schema in MySQL ensuring referential integrity for complex join queries.",
      "Developed a type-safe backend using Kotlin and Spring Boot, reducing boilerplate and runtime errors.",
      "Created a React frontend with strict state management for a snappy user experience.",
    ],
    outcome: [
      "Production-ready backend with comprehensive REST endpoints.",
      "Seamless user flow from registration to reviewing.",
      "Clean separation of concerns enabling easy feature additions.",
    ],
    highlights: ["Type-safe Backend", "Social Graph", "Product Design"],
    links: [
      { label: "Backend Repo", href: "https://github.com/BeerSpProject/BeerSp-Backend" },
      { label: "Frontend Repo", href: "https://github.com/BeerSpProject/BeerSp-Frontend" },
    ],
    gallery: [],
  },

  {
    slug: "embedded-stopwatch",
    palette: ["#ff5a4d", "#22a06b", "#0c1f16"],
    title: "Bare-metal Chrono",
    oneLiner: "High-precision Arduino chronometer",
    tags: ["C++", "Embedded", "Hardware", "Optimization"],
    thumb: "",

    year: "2023",
    role: "Systems Engineer",
    status: "Prototype",
    duration: "2 weeks",

    context:
      "A purely algorithmic implementation of a chronometer on limited hardware. The goal was to achieve maximum precision without relying on high-level abstraction libraries.",
    problem: [
      "Standard libraries introduce significant overhead and unpredictable latency.",
      "Limited clock cycles available for updating display and handling user input concurrently.",
      "Need for state-machine reliability to prevent 'ghost' inputs.",
    ],
    approach: [
      "Wrote raw C++ interacting directly with hardware registers for minimal latency.",
      "Implemented interrupt-driven logic for high-precision timekeeping.",
      "Designed a custom circular buffer for debounce logic to handle noisy physical buttons.",
    ],
    outcome: [
      "achieved microsecond-level precision on standard Arduino hardware.",
      "Zero 'blocking' code execution loop ensuring responsive UI.",
      "Codebase demonstrating deep understanding of memory and processor constraints.",
    ],
    highlights: ["Bare-metal C++", "Interrupts", "Memory Optimization"],
    links: [
      { label: "View Source", href: "https://github.com/carlosmatac/cronometro" },
    ],
    gallery: [],
  },

  {
    slug: "numbers-letters-solver",
    palette: ["#b69cff", "#5b3fd6", "#170e33"],
    title: "Algo Solver",
    oneLiner: "Search space optimization engine",
    tags: ["C++", "Algorithms", "Performance", "AI"],
    thumb: "",

    year: "2023",
    role: "Algorithm Engineer",
    status: "Shipped",
    duration: "2 weeks",

    context:
      "A computational engine designed to solve the 'Numbers and Letters' combinatorics puzzle. It navigates vast search spaces to find exact solutions in milliseconds.",
    problem: [
      "The search space for combinations grows exponentially.",
      "Brute force solutions are computationally too expensive for real-time use.",
      "Need to prioritize 'natural' mathematical solutions over complex ones.",
    ],
    approach: [
      "Implemented a Breadth-First Search (BFS) algorithm to guarantee finding the shortest solution path.",
      "Optimized data structures to minimize memory tracking of visited states.",
      "Applied pruning heuristics to discard non-viable branches early.",
    ],
    outcome: [
      "Solves complex permutation problems in under 10ms.",
      "Clean, modular C++ implementation of standard graph algorithms.",
      "Demonstrable efficiency improvement over recursive brute-force methods.",
    ],
    highlights: ["Graph Theory", "BFS", "Search Optimization"],
    links: [
      { label: "View Source", href: "https://github.com/carlosmatac/numbers-letters-v3" },
    ],
    gallery: [],
  },
];
