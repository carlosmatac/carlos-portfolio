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
  status?: "Concept" | "Prototype" | "Shipped" | "MVP";
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
    slug: "retail-analytics-platform",
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
