import { describe, expect, it } from "vitest";
import { insidePolygon, LOGO, logoLayout, parsePath, sampleLogo } from "../intro-logo-art";
import { logoWave } from "../intro-logo";
import { journeyAt } from "../journey";
import { JOURNEY } from "../journey-timeline";
import { flightEase } from "../motion";

describe("Intro logo", () => {
  it("parses both straight-line paths of the mark into closed polygons inside the view box", () => {
    const polygons = LOGO.paths.map(parsePath);
    expect(polygons.map(p => p.length)).toEqual([1, 1]);
    expect(polygons[0][0]).toHaveLength(9);
    expect(polygons[1][0].length).toBeGreaterThan(12);
    polygons.flat(2).forEach(([x, y]) => {
      expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(LOGO.viewBox);
      expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(LOGO.viewBox);
    });
    expect(insidePolygon([7, 20], polygons[0][0])).toBe(true);
    expect(insidePolygon([20, 20], polygons[0][0])).toBe(false);
  });

  it("samples a centred, unit-height mark with outlines on every depth layer and the fill in front", () => {
    let seed = 1;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const { samples } = sampleLogo(0.5, 5, 3, rng);
    const ys = samples.map(s => s.position[1]), xs = samples.map(s => s.position[0]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1, 1);
    expect(Math.abs((Math.max(...xs) + Math.min(...xs)) / 2)).toBeLessThan(0.02);
    expect(new Set(samples.map(s => s.part))).toEqual(new Set([0, 1]));
    const depths = new Set(samples.filter(s => s.edge).map(s => s.position[2].toFixed(4)));
    expect(depths.size).toBe(5);
    const front = Math.max(...samples.map(s => s.position[2]));
    samples.filter(s => !s.edge).forEach(s => expect(s.position[2]).toBeCloseTo(front));
  });

  it("sizes the mark from the viewport height, limited by narrow widths", () => {
    expect(logoLayout(1440, 900)).toEqual({ size: 396, centreY: 360 });
    expect(logoLayout(390, 844).size).toBeCloseTo(390 * 0.62);
  });
});

describe("Intro choreography", () => {
  const at = (clock: number, reduced = false) => {
    const earth = JOURNEY.anchors.earth / JOURNEY.totalH;
    return journeyAt(flightEase(clock) * earth, reduced);
  };
  const first = (key: "identity" | "logo" | "gather" | "worms" | "field" | "visible", test: (v: number) => boolean) => {
    for (let i = 0; i <= 1000; i++) {
      const frame = at(i / 1000), value = key === "visible" ? frame.earth.visible : frame[key];
      if (test(value)) return i / 1000;
    }
    return Infinity;
  };

  it("hands over from the logo to the streamers, to the cocoon, to the planet, in that order", () => {
    expect(first("identity", v => v === 0)).toBeLessThan(first("logo", v => v === 0));
    expect(first("gather", v => v > 0)).toBeLessThan(first("logo", v => v < 0.5));
    expect(first("visible", v => v > 0)).toBeGreaterThan(first("gather", v => v > 0.3));
    expect(first("gather", v => v === 1)).toBeLessThan(first("worms", v => v < 0.5));
    expect(first("visible", v => v > 0.9)).toBeLessThan(first("worms", v => v === 0));
    expect(first("field", v => v < 0.5)).toBeGreaterThan(first("visible", v => v > 0.3));
  });

  it("responds within the first 100 ms of the gesture", () => {
    const flight = 5600;
    expect(at(100 / flight).prompt).toBeLessThan(0.9);
  });

  it("keeps the logo still and the streamers away with reduced motion", () => {
    const frame = at(0.1, true);
    expect([frame.burst, frame.gather, frame.worms]).toEqual([0, 0, 0]);
    expect(frame.logo).toBe(frame.identity);
  });
});

describe("Idle swell", () => {
  const run = (from: number, idle: boolean, seconds: number, reduced = false, hz = 60) => {
    let wave = from;
    for (let i = 0; i < seconds * hz; i++) wave = logoWave(wave, idle, reduced, 1 / hz);
    return wave;
  };

  it("rises gently while there is no active cursor and never overshoots", () => {
    expect(run(0, true, 0.3)).toBeGreaterThan(0.15);
    expect(run(0, true, 0.3)).toBeLessThan(0.5);
    expect(run(0, true, 6)).toBeGreaterThan(0.99);
    expect(run(0, true, 60)).toBeLessThanOrEqual(1);
  });

  it("gives way quickly when the mouse moves again", () => {
    expect(run(1, false, 0.5)).toBeLessThan(0.3);
    expect(run(1, false, 3)).toBeLessThan(0.001);
  });

  it("stays still with reduced motion and does not depend on the frame rate", () => {
    expect(run(0, true, 10, true)).toBe(0);
    expect(run(1, true, 2, true)).toBeLessThan(0.01);
    expect(run(0, true, 1, false, 30)).toBeCloseTo(run(0, true, 1, false, 120), 6);
  });
});
