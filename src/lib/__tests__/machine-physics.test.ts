import { describe, expect, it } from "vitest";
import { advanceMarble, crosses, marblePosition, type MachineRoute } from "../machine-physics";

describe("Marble run", () => {
  it.each<MachineRoute>(["bell", "flight"])("joins each rail section without teleporting (%s)", route => {
    for (const join of [0.3, 0.69]) {
      const before = marblePosition(join - 0.000001, route);
      const after = marblePosition(join + 0.000001, route);
      expect(Math.hypot(...before.map((value, index) => value - after[index]))).toBeLessThan(0.001);
    }
  });
  it("keeps the shared loop identical and splits only at the junction", () => {
    for (const t of [0, 0.1, 0.3, 0.5, 0.69]) expect(marblePosition(t, "bell")).toEqual(marblePosition(t, "flight"));
    expect(marblePosition(1, "bell")[2]).toBeCloseTo(1.2);
    expect(marblePosition(1, "flight")[2]).toBeCloseTo(-1.4);
  });
  it("keeps rewinding positions finite, on the track, and bounded", () => {
    for (let i = 1000; i >= 0; i--) {
      const point = marblePosition(i / 1000);
      expect(point.every(Number.isFinite)).toBe(true);
      expect(point[1]).toBeGreaterThanOrEqual(0.59);
    }
    expect(marblePosition(-1)).toEqual(marblePosition(0));
    expect(marblePosition(2)).toEqual(marblePosition(1));
  });
  it("does not jump to the end after a hidden tab resumes", () => {
    expect(advanceMarble(0.25, 300)).toBeLessThan(0.26);
    expect(advanceMarble(0.25, -2)).toBe(0.25);
    expect(advanceMarble(0.999, 0.05)).toBe(1);
  });
  it("fires a consequence exactly once, even when a frame crosses its threshold", () => {
    const positions = [0.97, 0.98, 0.99, 1, 1, 1];
    expect(positions.slice(1).filter((value, index) => crosses(positions[index], value, 0.985))).toHaveLength(1);
  });
});
