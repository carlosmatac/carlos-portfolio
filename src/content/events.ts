/** Events that sit on the work board next to the projects that came out of them. */
export type BoardEvent = {
  id: string;
  title: string;
  lede: string;
  meta: string;
  image: { src: string; alt: string; width: number; height: number };
  palette: readonly [string, string, string];
  about: string;
  experience: string;
  /** The project built there; the board draws an edge to it. */
  project: string;
  links: { label: string; href: string }[];
};

export const HACKSPAIN: BoardEvent = {
  id: "hackspain-2026",
  title: "HackSpain 2026",
  lede: "Spain's 36-hour hackathon for builders under 30",
  meta: "18–20 Sep 2026 · UPM–ETSIT, Madrid",
  image: { src: "/images/work/hackspain-happyrobot.svg", alt: "HackSpain × HappyRobot", width: 1024, height: 223 },
  palette: ["#e92520", "#1f8f8a", "#3a1a14"],
  about:
    "HackSpain is an in-person, 36-hour hackathon for 250 builders under 30, held at UPM–ETSIT in Madrid. Its five tracks are led by startups, every team gets free compute, and Spanish venture capital firms judge a €5,000 grand prize.",
  experience:
    "I attended the 2026 edition and competed in the HappyRobot track, “Can AI manage a crisis?”. With a team of five we built Zhivel: AI agents that replan a live event as it unfolds and negotiate the new plan over real phone calls.",
  project: "zhivel",
  links: [
    { label: "hackspain.com", href: "https://hackspain.com/" },
    { label: "HappyRobot track", href: "https://hackspain2026.happyrobot.ai/" },
  ],
};

export const EVENTS = [HACKSPAIN];
