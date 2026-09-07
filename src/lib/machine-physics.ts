/** A reversible, deterministic marble run. Coordinates are also used to build its rails. */
export type Point3 = [number, number, number];
export type MachineRoute = "bell" | "flight";
export const RUN_SECONDS = 7.5;
export const MAX_MARBLES = 14;

export function marblePosition(progress: number, route: MachineRoute = "bell"): Point3 {
  const t = Math.max(0, Math.min(1, progress));
  if (t < 0.3) {
    const q = t / 0.3;
    return [-4.5 + q * 3.8, 3.55 - q * 2.6, -0.35];
  }
  if (t < 0.69) {
    const q = (t - 0.3) / 0.39;
    const a = -Math.PI / 2 + q * Math.PI * 2;
    return [-0.7 + Math.cos(a) * 1.45, 2.4 + Math.sin(a) * 1.45, -0.35 + q * 0.65];
  }
  const q = (t - 0.69) / 0.31;
  return [-0.7 + q * 5.4, 0.95 - q * 0.35, 0.3 + Math.sin(q * Math.PI / 2) * (route === "flight" ? -1.7 : 0.9)];
}

export function advanceMarble(progress: number, deltaSeconds: number): number {
  return Math.min(1, progress + Math.max(0, Math.min(deltaSeconds, 0.05)) / RUN_SECONDS);
}

export function crosses(previous: number, next: number, threshold: number): boolean {
  return previous < threshold && next >= threshold;
}
