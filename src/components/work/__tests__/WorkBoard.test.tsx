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

  it("lists the five largest recent projects first, with real imagery and public links", () => {
    expect(featured).toEqual(["aksum", "zhivel", "andres-mata-arquitectura", "diego-prados", "algoreto"]);
    expect(projects.slice(0, 5).map(project => project.slug)).toEqual(featured);
    const links = Object.fromEntries(projects.slice(0, 5).map(project => [project.slug, project.links?.map(link => link.href)]));
    expect(links.aksum).toEqual(["https://www.aksum.ai/", "https://github.com/carlosmatac/sovereign-data"]);
    expect(links.zhivel).toEqual(["https://zhivel.vercel.app/", "https://github.com/pdsdm/hackspain"]);
    expect(links["andres-mata-arquitectura"]).toEqual(["https://github.com/carlosmatac/arquitecture-web"]);
    expect(links["diego-prados"]).toEqual(["https://www.diegoprados.com/", "https://github.com/carlosmatac/diego-portfolio"]);
    expect(links.algoreto).toEqual(["https://algoreto.com/"]);
    expect(projects.find(project => project.slug === "zhivel")?.media).toMatchObject({ kind: "video", src: "/videos/zhivel.mp4" });
    expect(projects.find(project => project.slug === "aksum")?.media).toMatchObject({ kind: "video", src: "/videos/aksum.mp4" });
  });

  it("keeps every image and video of the projects in public/", () => {
    projects.forEach(({ media, showcase }) => {
      const files = [media?.src, media?.kind === "video" ? media.poster : undefined, ...(showcase?.gallery ?? []).map(image => image.src)];
      files.filter(Boolean).forEach(file => expect(existsSync(join(process.cwd(), "public", file!)), file).toBe(true));
    });
  });

  it.each([false, true])("gives every featured preview more room than any other project (compact: %s)", compact => {
    const layout = boardLayout(compact), area = (item: { width: number; height: number }) => item.width * item.height;
    const smallestFeatured = Math.min(...layout.filter(item => featured.includes(item.slug)).map(area));
    const largestOther = Math.max(...layout.filter(item => !featured.includes(item.slug)).map(area));
    expect(smallestFeatured).toBeGreaterThan(largestOther * 1.8);
  });
});

describe("Work board", () => {
  it("loops the Zhivel and Aksum videos silently on the board and offers them with controls in the details", async () => {
    await act(async () => { render(<WorkBoard />); });
    for (const slug of ["zhivel", "aksum"]) {
      const loop = document.querySelector<HTMLVideoElement>(`.react-flow__node[data-id="${slug}"] video`)!;
      expect(loop.muted, slug).toBe(true);
      expect(loop.loop, slug).toBe(true);
      expect(loop.controls, slug).toBe(false);
    }
    expect(document.querySelector('.react-flow__node[data-id="aksum"] video')?.getAttribute("poster")).toBe("/images/work/aksum-poster.webp");
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
    expect(document.querySelector('.react-flow__node[data-id="flysmart-spain"] .board-card-title')?.textContent).toBe("FlySmart Spain2024");
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


describe("Project window", () => {
  const openProject = async (slug: string) => {
    await act(async () => { render(<WorkBoard />); });
    fireEvent.click(document.querySelector(`.react-flow__node[data-id="${slug}"]`)!);
  };

  it("opens as a centred modal over an inert board and closes from the backdrop", async () => {
    await openProject("flysmart-spain");
    const dialog = screen.getByRole("dialog", { name: "FlySmart Spain" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector(".work-board-stage")?.hasAttribute("inert")).toBe(true);
    for (const heading of ["The problem", "Approach", "Outcome"]) expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    fireEvent.mouseDown(dialog);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(document.querySelector(".detail-backdrop")!);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector(".work-board-stage")?.hasAttribute("inert")).toBe(false);
  });

  it("keeps keyboard focus inside the window", async () => {
    await openProject("beersp");
    const close = screen.getByRole("button", { name: "Close details" });
    const links = screen.getAllByRole("link");
    links.at(-1)!.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(links.at(-1));
  });

  it("explains Aksum with an animated pipeline and four screenshots of the product", async () => {
    await openProject("aksum");
    const diagram = screen.getByText("How Aksum works").closest("figure")!;
    expect([...diagram.querySelectorAll("h4")].map(stage => stage.textContent)).toEqual(["Capture", "Connect", "Retrieve", "Activate"]);
    expect(document.querySelectorAll(".detail-gallery img")).toHaveLength(4);
    expect(screen.getByRole("img", { name: /knowledge graph linking people/ })).toBeInTheDocument();
  });

  it("shows Zhivel's key figures and an architecture diagram described for screen readers", async () => {
    await openProject("zhivel");
    expect([...document.querySelectorAll(".detail-facts strong")].map(fact => fact.textContent)).toEqual(["36 h", "5", "4", "600"]);
    expect(screen.getByRole("img", { name: /coordinator agent.*HappyRobot/ })).toBeInTheDocument();
    expect(document.querySelectorAll(".detail-gallery img")).toHaveLength(3);
  });

  it("shows Diego Prados' line boil with the real pencil drawings, in the order 01, 02, 03, 02", async () => {
    await openProject("diego-prados");
    const diagram = screen.getByText("How the pencil moves").closest("figure")!;
    const boils = diagram.querySelectorAll(".boil");
    expect(boils).toHaveLength(3);
    boils.forEach(boil => expect([...boil.querySelectorAll("img")].map(img => img.getAttribute("src")?.split("/").pop())).toEqual(["1.webp", "2.webp", "3.webp"]));
    expect([...diagram.querySelectorAll(".boil-strip span")].map(label => label.textContent)).toEqual(["01", "02", "03", "02"]);
    expect([...diagram.querySelectorAll(".dg-stage h4")].map(stage => stage.textContent)).toEqual(["Draw", "Clean", "Register", "Play"]);
    diagram.querySelectorAll("img").forEach(img => expect(existsSync(join(process.cwd(), "public", img.getAttribute("src")!))).toBe(true));
    expect(screen.getByRole("link", { name: /Visit diegoprados\.com/ }).getAttribute("href")).toBe("https://www.diegoprados.com/");
    expect(document.querySelectorAll(".detail-gallery img")).toHaveLength(4);
  });

  it("explains algoreto and links to its website", async () => {
    await openProject("algoreto");
    const dialog = screen.getByRole("dialog", { name: "algoreto" });
    expect(dialog.textContent).toContain("three technical partners");
    expect(dialog.textContent).toContain("first projects are free");
    expect(screen.getByRole("link", { name: /Visit algoreto\.com/ }).getAttribute("href")).toBe("https://algoreto.com/");
  });

  it("lets the architecture project wipe between the original photo and the result", async () => {
    await openProject("andres-mata-arquitectura");
    const slider = screen.getByRole("slider", { name: /original photo with the result/ });
    const compare = document.querySelector<HTMLElement>(".compare")!;
    expect(compare.style.getPropertyValue("--split")).toBe("50%");
    fireEvent.change(slider, { target: { value: "20" } });
    expect(compare.style.getPropertyValue("--split")).toBe("20%");
    expect(screen.getByRole("img", { name: /original photo$/ }).getAttribute("src")).toContain("elvira-before");
    expect(screen.getByRole("img", { name: /after the pipeline$/ }).getAttribute("src")).toContain("elvira-after");
  });
});

describe("Glass cards", () => {
  it("paints every card with its project's palette and marks featured ones with a glass chip", async () => {
    await act(async () => { render(<WorkBoard />); });
    projects.forEach(project => {
      const card = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${project.slug}"] .board-card`)!;
      expect(card.style.getPropertyValue("--p1"), project.slug).toMatch(/^#/);
      expect(!!card.querySelector(".board-card-chip")).toBe(!!project.featured);
    });
    expect(document.querySelector('.react-flow__node[data-id="stack-panel"] .stack-panel')).not.toBeNull();
  });
});
