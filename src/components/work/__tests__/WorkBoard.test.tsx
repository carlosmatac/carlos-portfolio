import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projects } from "@/content/projects";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { HACKSPAIN } from "@/content/events";
import { STACK, STACK_CATEGORIES } from "@/content/stack";
import { BOARD, BOARD_COMPACT, boardLayout, EVENT_PLACEMENTS, STACK_TILE, stackLayout } from "@/content/work-board";
import WorkBoard, { BOARD_EDGES } from "../WorkBoard";

beforeEach(() => {
  history.replaceState(null, "", "/work");
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("DOMMatrixReadOnly", class { m22 = 1; constructor() {} });
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Work board layout", () => {
  it.each([false, true])("places every project once, without overlapping previews (compact: %s)", compact => {
    const layout = boardLayout(compact);
    expect(layout.map(item => item.slug)).toEqual(projects.map(project => project.slug));
    const placements = compact ? BOARD_COMPACT : BOARD;
    expect(new Set(placements.map(item => item.slug)).size).toBe(placements.length);
    const caption = 44;
    layout.forEach((a, i) => layout.slice(i + 1).forEach(b => {
      const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height + caption <= b.y || b.y + b.height + caption <= a.y;
      expect(apart, `${a.slug} overlaps ${b.slug}`).toBe(true);
    }));
  });
});

describe("Featured projects", () => {
  const featured = projects.filter(project => project.featured).map(project => project.slug);

  it("lists the three largest recent projects first, with real imagery and public links", () => {
    expect(featured).toEqual(["aksum", "zhivel", "andres-mata-arquitectura"]);
    expect(projects.slice(0, 3).map(project => project.slug)).toEqual(featured);
    const links = Object.fromEntries(projects.slice(0, 3).map(project => [project.slug, project.links?.map(link => link.href)]));
    expect(links.aksum).toEqual(["https://www.aksum.ai/", "https://github.com/carlosmatac/sovereign-data"]);
    expect(links.zhivel).toEqual(["https://zhivel.vercel.app/", "https://github.com/pdsdm/hackspain"]);
    expect(links["andres-mata-arquitectura"]).toEqual(["https://github.com/carlosmatac/arquitecture-web"]);
    expect(projects.find(project => project.slug === "zhivel")?.media).toMatchObject({ kind: "video", src: "/videos/zhivel.mp4" });
  });

  it.each([false, true])("gives every featured preview more room than any other project (compact: %s)", compact => {
    const layout = boardLayout(compact), area = (item: { width: number; height: number }) => item.width * item.height;
    const smallestFeatured = Math.min(...layout.filter(item => featured.includes(item.slug)).map(area));
    const largestOther = Math.max(...layout.filter(item => !featured.includes(item.slug)).map(area));
    expect(smallestFeatured).toBeGreaterThan(largestOther * 1.8);
  });
});

describe("Work board", () => {
  it("loops the Zhivel video silently on the board and offers it with controls in the details", async () => {
    await act(async () => { render(<WorkBoard />); });
    const loop = document.querySelector<HTMLVideoElement>('.react-flow__node[data-id="zhivel"] video')!;
    expect(loop.muted).toBe(true);
    expect(loop.loop).toBe(true);
    expect(loop.controls).toBe(false);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(document.querySelector('.react-flow__node[data-id="aksum"] .board-card')?.getAttribute("data-featured")).toBe("true");
    fireEvent.click(document.querySelector('.react-flow__node[data-id="zhivel"]')!);
    const detail = screen.getByLabelText("Zhivel demo video") as HTMLVideoElement;
    expect(detail.controls).toBe(true);
    expect(detail.autoplay).toBe(false);
    expect(screen.getByRole("link", { name: /Live demo/ }).getAttribute("href")).toBe("https://zhivel.vercel.app/");
  });

  it("shows a floating preview for each project and opens its details", async () => {
    await act(async () => { render(<WorkBoard />); });
    const cards = document.querySelectorAll(".react-flow__node-project");
    expect(cards).toHaveLength(projects.length);
    expect(screen.getByText("FlySmart Spain, 2024")).toBeInTheDocument();
    fireEvent.click(document.querySelector('.react-flow__node[data-id="flysmart-spain"]')!);
    const drawer = await screen.findByRole("dialog", { name: "FlySmart Spain" });
    expect(location.hash).toBe("#flysmart-spain");
    expect(screen.getByRole("link", { name: /Backend Repo/ }).getAttribute("href")).toBe("https://github.com/FlySmartProject/FlySmartSpainBackend");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close details" }));
    expect(drawer).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(location.hash).toBe("");
  });

  it("opens a project from the keyboard and from a shared link", async () => {
    history.replaceState(null, "", "/work#beersp");
    await act(async () => { render(<WorkBoard />); });
    expect(screen.getByRole("dialog", { name: "BeerSp" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close details" }));
    const node = document.querySelector<HTMLElement>('.react-flow__node[data-id="numbers-letters-solver"]')!;
    expect(node.getAttribute("role")).toBe("button");
    expect(node.getAttribute("aria-label")).toContain("Algo Solver");
    fireEvent.keyDown(node, { key: "Enter" });
    expect(screen.getByRole("dialog", { name: "Algo Solver" })).toBeInTheDocument();
  });
});


describe("HackSpain on the board", () => {
  it.each([false, true])("hangs below Zhivel, joined by an edge, without covering any preview (compact: %s)", compact => {
    expect(BOARD_EDGES).toEqual([expect.objectContaining({ source: "zhivel", target: "hackspain-2026", label: "built at" })]);
    const event = EVENT_PLACEMENTS[HACKSPAIN.id][compact ? "compact" : "wide"];
    const layout = boardLayout(compact), zhivel = layout.find(item => item.slug === "zhivel")!;
    expect(event.y).toBeGreaterThan(zhivel.y + zhivel.height + 44);
    layout.forEach(item => {
      const apart = item.x + item.width <= event.x || event.x + event.width <= item.x || item.y + item.height + 44 <= event.y || event.y + event.height + 44 <= item.y;
      expect(apart, `HackSpain overlaps ${item.slug}`).toBe(true);
    });
  });

  it("explains the event, links to its website and leads to the project built there", async () => {
    await act(async () => { render(<WorkBoard />); });
    fireEvent.click(document.querySelector('.react-flow__node[data-id="hackspain-2026"]')!);
    const dialog = screen.getByRole("dialog", { name: "HackSpain 2026" });
    expect(dialog.textContent).toContain("36-hour hackathon");
    expect(dialog.textContent).toContain("I attended");
    expect(dialog.textContent).toContain("HappyRobot track");
    expect(screen.getByRole("link", { name: /hackspain\.com/ }).getAttribute("href")).toBe("https://hackspain.com/");
    expect(screen.getByRole("img", { name: "HackSpain × HappyRobot" }).getAttribute("src")).toBe("/images/work/hackspain-happyrobot.svg");
    fireEvent.click(screen.getByRole("button", { name: /Built there.*Zhivel/ }));
    expect(screen.getByRole("dialog", { name: "Zhivel" })).toBeInTheDocument();
    expect(location.hash).toBe("#zhivel");
  });
});

describe("Stack", () => {
  it("has a local logo and a real explanation for every tool, in known categories", () => {
    expect(new Set(STACK.map(tool => tool.id)).size).toBe(STACK.length);
    for (const name of ["Cursor", "Claude", "Codex", "Instinct", "Devin", "Orca", "QuiverAI", "Higgsfield", "Google Flow", "Glean", "Jira", "Remotion", "Adobe Premiere Pro"]) {
      expect(STACK.map(tool => tool.name)).toContain(name);
    }
    STACK.forEach(tool => {
      expect(STACK_CATEGORIES).toContain(tool.category);
      expect(existsSync(join(process.cwd(), "public", tool.icon)), tool.icon).toBe(true);
      expect(tool.use.length).toBeGreaterThan(40);
      expect(tool.url).toMatch(/^https:\/\//);
    });
  });

  it.each([false, true])("floats every logo below the projects without overlaps (compact: %s)", compact => {
    const { heading, tools } = stackLayout(compact);
    expect(tools).toHaveLength(STACK.length);
    const bottom = Math.max(...boardLayout(compact).map(item => item.y + item.height + 44));
    expect(heading.y).toBeGreaterThan(bottom);
    tools.forEach((a, i) => tools.slice(i + 1).forEach(b => {
      expect(Math.abs(a.x - b.x) >= STACK_TILE + 8 || Math.abs(a.y - b.y) >= STACK_TILE + 8, `${a.id} overlaps ${b.id}`).toBe(true);
    }));
    if (compact) tools.forEach(tool => expect(tool.x + STACK_TILE).toBeLessThanOrEqual(375));
  });

  it("shows logos instead of names, and explains a tool when it is opened", async () => {
    await act(async () => { render(<WorkBoard />); });
    const cursor = document.querySelector<HTMLElement>('.react-flow__node[data-id="stack-cursor"]')!;
    expect(cursor.textContent).toBe("");
    expect(cursor.querySelector("img")?.getAttribute("src")).toBe("/images/stack/cursor.svg");
    expect(cursor.getAttribute("aria-label")).toBe("Cursor. How I use it");
    fireEvent.keyDown(cursor, { key: "Enter" });
    const dialog = screen.getByRole("dialog", { name: "Cursor" });
    expect(dialog.textContent).toContain("How I use it");
    expect(screen.getByRole("link", { name: /Visit cursor\.com/ }).getAttribute("href")).toBe("https://cursor.com");
    const stack = screen.getByRole("button", { name: /^Stack/ });
    expect(stack.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(stack);
    expect(stack.getAttribute("aria-pressed")).toBe("true");
  });
});
