/**
 * Tools shown as floating logos in the Stack area of /work.
 * `glyph` icons are single-colour marks drawn on a dark tile; `app` icons already are a full tile.
 * Logos: Simple Icons (CC0) where available, otherwise each product's own favicon or app icon.
 */
export type StackCategory = "Coding agents" | "AI in my products" | "Creative & video" | "Build" | "Data" | "Work";
export type StackTool = { id: string; name: string; category: StackCategory; icon: string; style: "glyph" | "app"; url: string; use: string };

export const STACK_CATEGORIES: StackCategory[] = ["Coding agents", "AI in my products", "Creative & video", "Build", "Data", "Work"];

export const STACK: StackTool[] = [
  { id: "cursor", name: "Cursor", category: "Coding agents", icon: "/images/stack/cursor.svg", style: "glyph", url: "https://cursor.com",
    use: "My everyday editor. Agent mode for multi-file changes, inline edits for quick fixes and codebase-aware chat when I need to understand unfamiliar code." },
  { id: "claude", name: "Claude", category: "Coding agents", icon: "/images/stack/claude.svg", style: "glyph", url: "https://www.anthropic.com/claude",
    use: "Claude Code for long agentic sessions in the terminal, from refactors to whole features, and Claude for reviewing designs, specs and writing." },
  { id: "codex", name: "Codex", category: "Coding agents", icon: "/images/stack/codex.webp", style: "glyph", url: "https://openai.com/codex",
    use: "OpenAI's coding agent for parallel tasks and code review. Its image generation drew every pencil frame of Diego Prados' site, from the greeting to the line-boil objects, and the concept art that the Granada scene of this portfolio started from." },
  { id: "devin", name: "Devin", category: "Coding agents", icon: "/images/stack/devin.svg", style: "glyph", url: "https://devin.ai",
    use: "An autonomous engineer for end-to-end work. Much of this portfolio, from the WebGL journey to this board, was built pairing with Devin." },
  { id: "orca", name: "Orca", category: "Coding agents", icon: "/images/stack/orca.webp", style: "app", url: "https://www.onorca.dev",
    use: "The agent IDE where I run Claude Code, Codex and other agents side by side, each in its own git worktree, and review their diffs before merging." },
  { id: "mcp", name: "Model Context Protocol", category: "Coding agents", icon: "/images/stack/modelcontextprotocol.svg", style: "glyph", url: "https://modelcontextprotocol.io",
    use: "How I connect agents to real tools. Blender over MCP rendered the 3D scenes of this site; browsers and trackers join the same way." },

  { id: "openai", name: "OpenAI API", category: "AI in my products", icon: "/images/stack/openai.webp", style: "app", url: "https://platform.openai.com",
    use: "Entity extraction, embeddings and report generation in Aksum's ingestion pipeline." },
  { id: "ai-sdk", name: "Vercel AI SDK", category: "AI in my products", icon: "/images/stack/aisdk.svg", style: "app", url: "https://ai-sdk.dev",
    use: "Streaming chat, tool calling and the agentic RAG copilot in Aksum, independent of the model provider." },
  { id: "gemini", name: "Gemini API", category: "AI in my products", icon: "/images/stack/googlegemini.svg", style: "glyph", url: "https://ai.google.dev",
    use: "The image pipeline of the architecture studio's website: it retouches old photos while preserving the real geometry of each building." },
  { id: "happyrobot", name: "HappyRobot", category: "AI in my products", icon: "/images/stack/happyrobot.svg", style: "glyph", url: "https://www.happyrobot.ai",
    use: "Voice AI agents that make real phone calls, SMS and email. In Zhivel they were the specialists negotiating with suppliers during the crisis." },

  { id: "quiver", name: "QuiverAI", category: "Creative & video", icon: "/images/stack/quiver.svg", style: "app", url: "https://quiver.ai",
    use: "Vector generation. My CM logo, the HackSpain × HappyRobot artwork on this board and the engraved map of the architecture site were drawn as SVG with it." },
  { id: "higgsfield", name: "Higgsfield", category: "Creative & video", icon: "/images/stack/higgsfield.webp", style: "app", url: "https://higgsfield.ai",
    use: "AI image and video generation for product visuals and short promo clips." },
  { id: "flow", name: "Google Flow", category: "Creative & video", icon: "/images/stack/flow.webp", style: "glyph", url: "https://labs.google/fx/tools/flow",
    use: "Google's AI filmmaking tool, built on Veo, for generating and extending the shots of demo videos." },
  { id: "remotion", name: "Remotion", category: "Creative & video", icon: "/images/stack/remotion.webp", style: "app", url: "https://www.remotion.dev",
    use: "Videos written in React and rendered from code: the Aksum product overview on this board and the pencil route film of Diego Prados' site." },
  { id: "premiere", name: "Adobe Premiere Pro", category: "Creative & video", icon: "/images/stack/premiere.svg", style: "app", url: "https://www.adobe.com/products/premiere.html",
    use: "The final edit of demo videos: cuts, pacing, titles and sound." },
  { id: "blender", name: "Blender", category: "Creative & video", icon: "/images/stack/blender.svg", style: "glyph", url: "https://www.blender.org",
    use: "3D scenes and Cycles renders scripted in Python, like the Gateway Arch above the clouds and the Granada scene of this portfolio." },

  { id: "typescript", name: "TypeScript", category: "Build", icon: "/images/stack/typescript.svg", style: "glyph", url: "https://www.typescriptlang.org",
    use: "My default language across frontends, APIs and agents." },
  { id: "nextjs", name: "Next.js", category: "Build", icon: "/images/stack/nextdotjs.svg", style: "glyph", url: "https://nextjs.org",
    use: "The App Router framework behind Aksum and this portfolio." },
  { id: "astro", name: "Astro", category: "Build", icon: "/images/stack/astro.svg", style: "glyph", url: "https://astro.build",
    use: "Diego Prados' site: static pages for the pencil animations and a server-rendered blog with its own editor on Vercel." },
  { id: "react", name: "React", category: "Build", icon: "/images/stack/react.svg", style: "glyph", url: "https://react.dev",
    use: "Interfaces from dashboards to Zhivel's live operations panel and this board, built with React Flow." },
  { id: "threejs", name: "Three.js", category: "Build", icon: "/images/stack/threedotjs.svg", style: "glyph", url: "https://threejs.org",
    use: "The WebGL journey of this portfolio: the Earth, the volumetric cloud passages and the city scenes." },
  { id: "supabase", name: "Supabase", category: "Build", icon: "/images/stack/supabase.svg", style: "glyph", url: "https://supabase.com",
    use: "Postgres, auth, storage and row-level security for multi-tenant products, with pgvector for semantic search in Aksum." },
  { id: "python", name: "Python", category: "Build", icon: "/images/stack/python.svg", style: "glyph", url: "https://www.python.org",
    use: "ETL pipelines, data wrangling with Pandas and scripting: the Blender automation of this site and the Pillow scripts that turn pencil drawings into line-boil frames." },
  { id: "vercel", name: "Vercel", category: "Build", icon: "/images/stack/vercel.svg", style: "glyph", url: "https://vercel.com",
    use: "Deployments and preview environments for Next.js and Vite apps, Zhivel's frontend among them." },

  { id: "dbt", name: "dbt", category: "Data", icon: "/images/stack/dbt.webp", style: "glyph", url: "https://www.getdbt.com",
    use: "Tested, documented transformation layers, from staging to marts, as in the retail analytics platform." },
  { id: "snowflake", name: "Snowflake", category: "Data", icon: "/images/stack/snowflake.svg", style: "glyph", url: "https://www.snowflake.com",
    use: "Cloud warehousing for analytics marts, with compute and storage scaled separately." },
  { id: "databricks", name: "Databricks", category: "Data", icon: "/images/stack/databricks.svg", style: "glyph", url: "https://www.databricks.com",
    use: "Lakehouse data platforms and pipelines in my work as a Data Architect." },

  { id: "glean", name: "Glean", category: "Work", icon: "/images/stack/glean.webp", style: "glyph", url: "https://www.glean.com",
    use: "Enterprise AI search and assistants across company knowledge, to find context and answers at work." },
  { id: "jira", name: "Jira", category: "Work", icon: "/images/stack/jira.svg", style: "glyph", url: "https://www.atlassian.com/software/jira",
    use: "Sprint planning and issue tracking with product and engineering teams." },
  { id: "instinct", name: "Instinct", category: "Work", icon: "/images/stack/instinct.webp", style: "app", url: "https://instinct.com",
    use: "A personal AI agent I text or call to follow up on threads and handle everyday errands." },
];
