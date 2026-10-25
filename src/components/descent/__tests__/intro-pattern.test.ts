import { describe, expect, it } from "vitest";
import { patternMetrics, patternSegments, type PatternInput } from "../intro-pattern";

const W = 1440, H = 900;
const input = (extra: Partial<PatternInput> = {}): PatternInput =>
  ({ width: W, height: H, seconds: 3, focus: { x: 400, y: 300 }, pull: 1, warp: 0, centre: { x: W / 2, y: H / 2 }, ...extra });
const each = (segments: Float32Array, visit: (s: { x: number; y: number; dx: number; dy: number; length: number; alpha: number }) => void) => {
  for (let i = 0; i < segments.length; i += 5) {
    const [x1, y1, x2, y2, alpha] = segments.subarray(i, i + 5);
    visit({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, dx: x2 - x1, dy: y2 - y1, length: Math.hypot(x2 - x1, y2 - y1), alpha });
  }
};

describe("Intro pattern", () => {
  it("covers the viewport with a grid of short strokes", () => {
    const { spacing } = patternMetrics(W, H);
    const segments = patternSegments(input());
    expect(segments.length / 5).toBe((Math.ceil(W / spacing) + 1) * (Math.ceil(H / spacing) + 1));
    each(segments, s => { expect(s.length).toBeLessThan(spacing * 1.2); expect(s.alpha).toBeGreaterThan(0); expect(s.alpha).toBeLessThanOrEqual(1); });
  });

  it("swirls around the focus and lights up there", () => {
    const { spacing } = patternMetrics(W, H);
    let near = 0, far = 0;
    each(patternSegments(input()), s => {
      const d = Math.hypot(s.x - 400, s.y - 300);
      if (d > spacing * 1.5 && d < spacing * 3) {
        // Tangential: the stroke is perpendicular to the line towards the focus.
        expect(Math.abs((s.dx * (s.x - 400) + s.dy * (s.y - 300)) / (s.length * d))).toBeLessThan(0.35);
        near = Math.max(near, s.alpha);
      }
      if (d > 900) far = Math.max(far, s.alpha);
    });
    expect(near).toBeGreaterThan(far);
  });

  it("turns radial and stretches towards the edges at full warp", () => {
    let edge = 0, middle = Infinity;
    each(patternSegments(input({ warp: 1 })), s => {
      const cx = s.x - W / 2, cy = s.y - H / 2, d = Math.hypot(cx, cy);
      if (d < 60) { middle = Math.min(middle, s.length); return; }
      expect(Math.abs((s.dx * cx + s.dy * cy) / (s.length * d))).toBeGreaterThan(0.99);
      edge = Math.max(edge, s.length);
    });
    expect(edge).toBeGreaterThan(middle * 3);
  });
});
