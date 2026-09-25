/**
 * Brno as a dot-matrix memory: a red-and-cream Tatra T3 tram on a night street below Petrov.
 * Pure helpers shared by the scene and its tests. Scene units are metres.
 */
type Vec3 = [number, number, number];

/** One tram every cycle: arrives, pauses briefly, departs and the next one follows almost at once. */
export const TRAM_CYCLE = { approach: 4, dwell: 1.2, depart: 4, gap: 0.3 };
export const TRAM_STOP_X = 5;
const TRAM_ENTRY_X = 70;
export function tramState(seconds: number, reduced = false) {
  if (reduced) return { x: TRAM_STOP_X, speed: 0, phase: "dwell" as const };
  const { approach, dwell, depart, gap } = TRAM_CYCLE, period = approach + dwell + depart + gap;
  const t = ((seconds % period) + period) % period;
  const distance = TRAM_ENTRY_X - TRAM_STOP_X;
  if (t < approach) {
    const u = t / approach;
    return { x: TRAM_ENTRY_X - distance * (1 - (1 - u) ** 3), speed: 3 * distance * (1 - u) ** 2 / approach, phase: "approach" as const };
  }
  if (t < approach + dwell) return { x: TRAM_STOP_X, speed: 0, phase: "dwell" as const };
  if (t < approach + dwell + depart) {
    const u = (t - approach - dwell) / depart;
    return { x: TRAM_STOP_X - distance * u ** 3, speed: 3 * distance * u * u / depart, phase: "depart" as const };
  }
  return { x: -TRAM_ENTRY_X, speed: 0, phase: "gap" as const };
}

/** 5×5 glyphs ordered by ink coverage, from an empty cell to a solid block. Bit index = row * 5 + column. */
const GLYPH_ROWS = [
  [".....", ".....", ".....", ".....", "....."],
  [".....", ".....", "..#..", ".....", "....."],
  [".....", "..#..", ".###.", "..#..", "....."],
  [".....", ".###.", ".###.", ".###.", "....."],
  ["..#..", ".###.", "#####", ".###.", "..#.."],
  ["#####", "#...#", "#.#.#", "#...#", "#####"],
  [".###.", "#####", "#####", "#####", ".###."],
  ["#####", "#####", "#####", "#####", "#####"],
];
export const GLYPHS = GLYPH_ROWS.map(rows => rows.join("").split("").reduce((bits, c, i) => c === "#" ? bits | (1 << i) : bits, 0));
export const glyphCoverage = (bits: number) => bits.toString(2).split("").filter(b => b === "1").length / 25;

/** Coarse cell in CSS pixels; arrival and departure start from chunky pixels and resolve. */
export function brnoCell(width: number, excursion: number) {
  const base = width < 700 ? 5 : 6;
  return base * (1 + 7 * excursion * excursion);
}

export type BrnoView = { fov: number; position: Vec3; target: Vec3 };
/** Desktop leaves the left third for the story; portrait lifts the tram and Petrov above it. */
export function brnoView(width: number, height: number): BrnoView {
  const aspect = width / Math.max(1, height);
  if (width < 700 || aspect < 0.9) return { fov: 50, position: [1.5, 3.2, 40], target: [5.5, -4, 0] };
  return { fov: 34, position: [-7, 1.7, 25], target: [0, 3.5, 0] };
}
export function brnoCamera(view: BrnoView, excursion: number, sway: [number, number]) {
  const [px, py, pz] = view.position, [tx, ty, tz] = view.target;
  return {
    position: [px + sway[0] * 1.2, py + excursion * 26 + sway[1] * 0.5, pz + excursion * 10] as Vec3,
    target: [tx + sway[0] * 0.3, ty + excursion * 6, tz] as Vec3,
  };
}

/** Deterministic PRNG for facades and windows. */
export function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
