export type Project = {
  slug: string;
  title: string;
  year: string;
  oneLiner: string;
  tags: string[];
  role?: string;
  links?: { label: string; href: string }[];
  sections: {
    heading: "Context" | "What I did" | "Stack" | "Outcome";
    content: string[]; // bullets
  }[];
};

export const projects: Project[] = [
  {
    slug: "rossystems",
    title: "ROS 2 Systems Work",
    year: "2024–2025",
    oneLiner: "Performance & reliability work in ROS 2-based systems (NDA-safe).",
    tags: ["C++", "ROS 2", "Qt", "Perf"],
    sections: [
      { heading: "Context", content: ["Built and maintained components for mission-oriented systems."] },
      { heading: "What I did", content: ["Latency profiling", "Improved reliability", "Created reusable framework (internal)."] },
      { heading: "Stack", content: ["C++", "ROS 2", "Qt", "Linux"] },
      { heading: "Outcome", content: ["Clear benchmarks + engineering guidelines for the team."] },
    ],
  },
  {
    slug: "flysmart",
    title: "FlySmart",
    year: "2025",
    oneLiner: "Flight price comparison platform with a clean UX and backend integrations.",
    tags: ["React", "API", "Product"],
    sections: [
      { heading: "Context", content: ["Built a product-oriented app focused on search and comparison UX."] },
      { heading: "What I did", content: ["Frontend implementation", "API integration", "Data modeling basics."] },
      { heading: "Stack", content: ["React", "TypeScript"] },
      { heading: "Outcome", content: ["Working MVP + strong focus on UX polish."] },
    ],
  },
  {
    slug: "beersp",
    title: "BeerSp",
    year: "2025",
    oneLiner: "Full-stack social platform for beer ratings: auth, search, ranking, profiles.",
    tags: ["Spring Boot", "MySQL", "React"],
    sections: [
      { heading: "Context", content: ["Team project with Scrum and real deliverables."] },
      { heading: "What I did", content: ["Backend endpoints", "Frontend pages", "Search/autocomplete experience."] },
      { heading: "Stack", content: ["Spring Boot", "MySQL", "React", "TypeScript"] },
      { heading: "Outcome", content: ["End-to-end feature delivery + documentation discipline."] },
    ],
  },
];
