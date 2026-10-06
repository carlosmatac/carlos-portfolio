import { projects } from "./projects";
import { STACK, STACK_CATEGORIES } from "./stack";

/** Where each project floats on the /work board (flow coordinates, top-left of the preview). */
export type BoardPlacement = { slug: string; x: number; y: number; width: number; height: number; float: number; delay: number };

export const BOARD: BoardPlacement[] = [
  { slug: "aksum", x: 0, y: 0, width: 440, height: 244, float: 9.4, delay: -1.8 },
  { slug: "zhivel", x: 500, y: -40, width: 460, height: 259, float: 8.1, delay: -4.6 },
  { slug: "andres-mata-arquitectura", x: 1020, y: 20, width: 400, height: 250, float: 9.9, delay: -3.1 },
  { slug: "diego-prados", x: 1480, y: -10, width: 400, height: 267, float: 8.7, delay: -2.4 },
  { slug: "algoreto", x: 1420, y: 370, width: 460, height: 288, float: 7.9, delay: -3.8 },
  { slug: "retail-analytics-platform", x: 0, y: 400, width: 250, height: 163, float: 7.2, delay: 0 },
  { slug: "energy-market-integrator", x: 300, y: 450, width: 210, height: 140, float: 8.4, delay: -2.1 },
  { slug: "flysmart-spain", x: 580, y: 540, width: 240, height: 156, float: 6.8, delay: -4.3 },
  { slug: "beersp", x: 935, y: 410, width: 150, height: 187, float: 9.1, delay: -1.2 },
  { slug: "embedded-stopwatch", x: 1120, y: 380, width: 200, height: 134, float: 7.7, delay: -3.4 },
  { slug: "numbers-letters-solver", x: 1140, y: 610, width: 210, height: 158, float: 8.8, delay: -5.6 },
];

/** Narrow screens: two staggered columns, so previews stay close to their real size. */
export const BOARD_COMPACT: BoardPlacement[] = [
  { slug: "aksum", x: 0, y: 0, width: 375, height: 208, float: 9.4, delay: -1.8 },
  { slug: "zhivel", x: 0, y: 290, width: 375, height: 211, float: 8.1, delay: -4.6 },
  { slug: "andres-mata-arquitectura", x: 0, y: 780, width: 375, height: 234, float: 9.9, delay: -3.1 },
  { slug: "diego-prados", x: 0, y: 1100, width: 375, height: 250, float: 8.7, delay: -2.4 },
  { slug: "algoreto", x: 0, y: 1430, width: 375, height: 234, float: 7.9, delay: -3.8 },
  { slug: "retail-analytics-platform", x: 0, y: 1750, width: 190, height: 124, float: 7.2, delay: 0 },
  { slug: "energy-market-integrator", x: 215, y: 1810, width: 160, height: 106, float: 8.4, delay: -2.1 },
  { slug: "flysmart-spain", x: 10, y: 1940, width: 180, height: 117, float: 6.8, delay: -4.3 },
  { slug: "beersp", x: 220, y: 1980, width: 150, height: 187, float: 9.1, delay: -1.2 },
  { slug: "embedded-stopwatch", x: 0, y: 2122, width: 180, height: 120, float: 7.7, delay: -3.4 },
  { slug: "numbers-letters-solver", x: 205, y: 2232, width: 170, height: 128, float: 8.8, delay: -5.6 },
];

/** Events hang just below the project built there, joined to it by an edge. */
export const EVENT_PLACEMENTS: Record<string, { wide: Omit<BoardPlacement, "slug">; compact: Omit<BoardPlacement, "slug"> }> = {
  "hackspain-2026": {
    wide: { x: 555, y: 330, width: 350, height: 100, float: 8.6, delay: -2.7 },
    compact: { x: 28, y: 600, width: 320, height: 92, float: 8.6, delay: -2.7 },
  },
};

/** Projects added later still appear: they join a grid below the arranged ones until placed by hand. */
export function boardLayout(compact = false) {
  const placed = new Map((compact ? BOARD_COMPACT : BOARD).map(item => [item.slug, item]));
  const columns = compact ? 2 : 4, cell = compact ? 200 : 320, top = compact ? 2430 : 820;
  let extra = 0;
  return projects.map(project => placed.get(project.slug) ?? {
    slug: project.slug, x: (extra % columns) * cell, y: top + Math.floor(extra++ / columns) * (compact ? 190 : 300),
    width: compact ? 170 : 240, height: compact ? 112 : 160, float: 8, delay: -extra,
  });
}

/** Where the Stack area starts: below every project, including any placed automatically. */
function stackTop(compact: boolean) {
  const bottom = Math.max(...boardLayout(compact).map(item => item.y + item.height + 44));
  return bottom + (compact ? 170 : 120);
}

export const STACK_TILE = 60;

/** The Stack area: a heading, one label per category and its logos, gently scattered. */
export function stackLayout(compact = false) {
  const top = stackTop(compact);
  const labels: { id: string; text: string; x: number; y: number }[] = [];
  const tools: { id: string; x: number; y: number; float: number; delay: number }[] = [];
  let cursor = top + 76;
  STACK_CATEGORIES.forEach((category, column) => {
    const items = STACK.filter(tool => tool.category === category);
    const perRow = compact ? 4 : 3, originX = compact ? 18 : column * 256, originY = compact ? cursor : top + 80;
    labels.push({ id: `label-${column}`, text: category, x: originX, y: originY });
    items.forEach((tool, index) => {
      const row = Math.floor(index / perRow), slot = index % perRow;
      const jitterX = ((index * 37 + column * 11) % 13) - 6, jitterY = (row % 2 ? 0 : slot % 2 ? 12 : -4) + ((index * 53) % 9) - 4;
      tools.push({
        id: `stack-${tool.id}`, x: originX + slot * (compact ? 88 : 80) + jitterX, y: originY + 42 + row * 86 + jitterY,
        float: 6 + ((index * 7 + column * 3) % 5), delay: -((index * 1.3 + column) % 6),
      });
    });
    cursor = originY + 42 + Math.ceil(items.length / perRow) * 86 + 30;
  });
  return { heading: { x: 0, y: top }, labels, tools };
}

/** Bounds of the coloured field behind the Stack area, with a margin around its logos. */
export function stackPanel(compact = false) {
  const { heading, tools } = stackLayout(compact), margin = compact ? 14 : 44;
  const right = Math.max(...tools.map(tool => tool.x)) + STACK_TILE, bottom = Math.max(...tools.map(tool => tool.y)) + STACK_TILE;
  const x = heading.x - margin, y = heading.y - margin;
  return { x, y, width: right + margin - x, height: bottom + margin - y };
}
