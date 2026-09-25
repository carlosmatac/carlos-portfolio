import { describe, expect, it } from "vitest";
import { insidePolygon, LOGO, logoLayout, parsePath, sampleLogo } from "../intro-logo-art";
import { journeyAt } from "../journey";
import { INTRO_END } from "../journey-timeline";

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
  const at = (intro: number, reduced = false) => journeyAt(intro * INTRO_END, reduced);

  it("fades the identity, bursts the logo, flashes, then falls", () => {
    expect(at(0)).toMatchObject({ identity: 1, prompt: 1, burst: 0, flash: 0, logo: 1, speed: 0 });
    const peak = [0.2, 0.24, 0.26, 0.28, 0.32].reduce((best, t) => at(t).flash > at(best).flash ? t : best, 0.2);
    expect(peak).toBeLessThan(0.32);
    expect(at(0.14).identity).toBe(0);
    expect(at(0.36).burst).toBe(1);
    expect(at(0.42).logo).toBe(0);
    expect(at(0.3).distance).toBe(0);
  });

  it("brakes progressively: speed falls monotonically after the warp while the Earth grows to full size", () => {
    const samples = [0.34, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1].map(t => at(t));
    samples.slice(1).forEach((s, i) => {
      expect(s.speed).toBeLessThanOrEqual(samples[i].speed);
      expect(s.earth.visible).toBeGreaterThanOrEqual(samples[i].earth.visible);
      expect(s.distance).toBeGreaterThanOrEqual(samples[i].distance);
    });
    expect(at(1).speed).toBe(0); expect(at(1).earth.visible).toBe(1);
    expect(at(0.6).earth.visible).toBeGreaterThan(0);
  });

  it("keeps the logo still and only fades it with reduced motion", () => {
    const frame = at(0.1, true);
    expect([frame.burst, frame.flash, frame.speed, frame.stars]).toEqual([0, 0, 0, 0]);
    expect(frame.logo).toBe(frame.identity);
  });
});
