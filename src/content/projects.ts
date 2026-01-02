export type Project = {
  slug: string;
  title: string;
  oneLiner: string;
  tags: string[];
  thumb: string;
};

export const projects: Project[] = [
  {
    slug: "project-aura",
    title: "PROJECT AURA",
    oneLiner: "Autonomous navigation system architecture",
    tags: ["ROS2", "C++", "Qt"],
    thumb: "/thumbs/aura.png",
  },
  {
    slug: "synapse-data",
    title: "SYNAPSE DATA",
    oneLiner: "Scalable real-time data platform",
    tags: ["Python", "Kafka", "AWS"],
    thumb: "/thumbs/synapse.png",
  },
  {
    slug: "quantum-edge",
    title: "QUANTUM EDGE",
    oneLiner: "High-frequency trading interface",
    tags: ["C++", "Linux", "UI/UX"],
    thumb: "/thumbs/quantum.png",
  },
];
