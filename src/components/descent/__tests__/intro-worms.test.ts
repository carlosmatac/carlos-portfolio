import { describe, expect, it } from "vitest";
import { createWormField, keepClear, stepWorms, wormMetrics, type WormField, type WormsInput } from "../intro-worms";

const W = 1440, H = 900;
const logo = { x: W / 2, y: H * 0.4, r: 206, length: 245 };
const globe = { x: W / 2, y: H / 2, r: 300 };
const input = (seconds: number, extra: Partial<WormsInput> = {}): WormsInput =>
  ({ width: W, height: H, dt: 1 / 60, seconds, pointer: null, logo, gather: 0, globe, ...extra });
const each = (field: WormField, buffer: "sim" | "view", visit: (x: number, y: number) => void) =>
  field.worms.forEach(worm => { for (let j = 0; j < worm[buffer].length; j += 2) visit(worm[buffer][j], worm[buffer][j + 1]); });

describe("Streamers", () => {
  it("can never be touched, even by a pointer chasing them", () => {
    const field = createWormField(W, H), { clearance } = wormMetrics(W, H);
    let closest = Infinity;
    for (let frame = 0; frame < 1200; frame++) {
      // Jump straight onto a head, then sweep through the bodies.
      const target = field.worms[frame % field.worms.length].sim;
      const pointer = frame % 3 ? { x: target[8], y: target[9] } : { x: (frame * 37) % W, y: (frame * 23) % H };
      stepWorms(field, input(frame / 60, { pointer }));
      for (const buffer of ["sim", "view"] as const) each(field, buffer, (x, y) => { closest = Math.min(closest, Math.hypot(x - pointer.x, y - pointer.y)); });
    }
    expect(closest).toBeGreaterThanOrEqual(clearance - 1e-3);
  });

  it("never stops swimming and stays around the screen", () => {
    const field = createWormField(W, H);
    let slowest = Infinity, outside = 0, samples = 0;
    for (let frame = 0; frame < 60 * 40; frame++) {
      const before = field.worms.map(worm => [worm.sim[0], worm.sim[1]]);
      stepWorms(field, input(frame / 60, { pointer: { x: W * 0.3 + Math.sin(frame / 40) * 300, y: H * 0.6 } }));
      field.worms.forEach((worm, i) => {
        slowest = Math.min(slowest, Math.hypot(worm.sim[0] - before[i][0], worm.sim[1] - before[i][1]) * 60);
        samples++;
        if (worm.sim[0] < -60 || worm.sim[0] > W + 60 || worm.sim[1] < -60 || worm.sim[1] > H + 60) outside++;
      });
    }
    expect(slowest).toBeGreaterThan(40);
    expect(outside / samples).toBeLessThan(0.02);
  });

  it("swims around the logo and the name rather than over them", () => {
    const field = createWormField(W, H);
    let inside = 0, total = 0;
    for (let frame = 0; frame < 60 * 30; frame++) {
      stepWorms(field, input(frame / 60));
      if (frame < 600) continue;
      each(field, "view", (x, y) => {
        total++;
        const ny = Math.min(Math.max(y, logo.y), logo.y + logo.length);
        if (Math.hypot(x - logo.x, y - ny) < logo.r * 0.85) inside++;
      });
    }
    expect(inside / total).toBeLessThan(0.03);
  });

  it("wraps onto great circles of the globe once gathered, and is deterministic", () => {
    const a = createWormField(W, H), b = createWormField(W, H);
    for (let frame = 0; frame < 120; frame++) { stepWorms(a, input(frame / 60)); stepWorms(b, input(frame / 60)); }
    stepWorms(a, input(2, { gather: 1 }));
    each(a, "view", (x, y) => {
      expect(Math.hypot(x - globe.x, y - globe.y)).toBeLessThanOrEqual(globe.r * 1.06 + 1e-3);
    });
    expect(a.worms.some(worm => [...worm.depth].some(z => z < -0.2))).toBe(true);
    stepWorms(b, input(2, { gather: 1 }));
    expect(Array.from(a.worms[0].view)).toEqual(Array.from(b.worms[0].view));
  });

  it("swims onto the globe head first", () => {
    const field = createWormField(W, H);
    stepWorms(field, input(0, { gather: 0.2 }));
    const worm = field.worms[0], last = worm.depth.length - 1;
    expect(Math.abs(worm.depth[0])).toBeGreaterThan(0);
    expect(worm.depth[last]).toBe(0);
  });

  it("pushes points out to the clearance circle", () => {
    const buffer = new Float32Array([10, 0, 100, 0, 0, 0]);
    keepClear(buffer, { x: 0, y: 0 }, 50);
    expect(Array.from(buffer)).toEqual([50, 0, 100, 0, 50, 0]);
  });

  it("uses fewer, thinner streamers on phones", () => {
    expect(createWormField(390, 844).worms.length).toBeLessThan(createWormField(W, H).worms.length);
    expect(wormMetrics(390, 844).points).toBeLessThan(wormMetrics(W, H).points);
  });
});
