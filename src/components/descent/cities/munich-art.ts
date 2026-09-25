/**
 * Munich as a mission display: an Airbus H145 over the HAT.tec helipad, Eurofighters crossing a Föhn sky,
 * Munich's skyline and the Alps. Pure helpers shared by the scene and its tests. Units are metres.
 */
type Vec3 = [number, number, number];

/** Coarse cell width in CSS pixels; cells are 6×6 micro-pixels and start chunky while landing. */
export function munichCell(width: number, excursion: number) {
  const base = width < 700 ? 5 : 6;
  return base * (1 + 7 * excursion * excursion);
}

export const PAD: Vec3 = [0, 30, 0];
/** Where the helicopter wants to be: the point under the cursor (kept inside a box above the pad), otherwise a slow hover. */
export function helicopterGoal(aim: Vec3 | null, seconds: number, reduced: boolean): Vec3 {
  const home: Vec3 = [PAD[0] - 7, PAD[1] + 10.5, PAD[2] + 14];
  if (reduced) return home;
  if (!aim) return [home[0] + Math.sin(seconds * 0.23) * 4, home[1] + Math.sin(seconds * 0.37) * 1.2, home[2] + Math.sin(seconds * 0.46) * 3];
  return [Math.max(home[0] - 26, Math.min(home[0] + 30, aim[0])), Math.max(PAD[1] + 4, Math.min(PAD[1] + 24, aim[1])), Math.max(home[2] - 20, Math.min(home[2] + 12, aim[2]))];
}
/** Intersects the cursor ray with the vertical plane through the hover point that faces the camera. */
export function aimPoint(origin: Vec3, direction: Vec3): Vec3 | null {
  const anchor = helicopterGoal(null, 0, true), normal = [anchor[0] - origin[0], 0, anchor[2] - origin[2]];
  const length = Math.hypot(normal[0], normal[2]), n = [normal[0] / length, 0, normal[2] / length];
  const facing = direction[0] * n[0] + direction[2] * n[2];
  if (facing <= 1e-4) return null;
  const t = ((anchor[0] - origin[0]) * n[0] + (anchor[2] - origin[2]) * n[2]) / facing;
  return [origin[0] + direction[0] * t, origin[1] + direction[1] * t, origin[2] + direction[2] * t];
}
/** Critically damped follow with attitude from acceleration: nose down to speed up, bank into turns. */
export function stepHelicopter(state: { position: Vec3; velocity: Vec3 }, goal: Vec3, dt: number) {
  const k = 3.2, c = 2 * Math.sqrt(k);
  const acceleration = goal.map((g, i) => (g - state.position[i]) * k - state.velocity[i] * c) as Vec3;
  const velocity = state.velocity.map((v, i) => v + acceleration[i] * dt) as Vec3;
  const position = state.position.map((p, i) => p + velocity[i] * dt) as Vec3;
  return {
    position, velocity,
    bank: Math.max(-0.5, Math.min(0.5, -velocity[0] * 0.05 - acceleration[0] * 0.02)),
    pitch: Math.max(-0.35, Math.min(0.35, velocity[2] * 0.04 + acceleration[2] * 0.015)),
  };
}

/** A pair of Eurofighters crosses the sky once per period, leaving contrails. */
export const JET_PERIOD = 12;
export function jetPair(seconds: number, reduced: boolean) {
  const t = reduced ? 5.2 : ((seconds % JET_PERIOD) + JET_PERIOD) % JET_PERIOD;
  const lead: Vec3 = [1500 - t * 260, 230 + t * 6, -900];
  return { lead, wing: [lead[0] + 60, lead[1] - 12, lead[2] + 55] as Vec3, trail: Math.min(t, 3.2) * 260, visible: t < 11.4 };
}

/** Mission route from the pad towards the Alps. */
export const WAYPOINTS: Vec3[] = [[70, 58, -40], [230, 86, -210], [520, 126, -430], [960, 176, -720]];

/** HAT.tec logotype, in logo units (cap height 1): a two-stem grey H and T around the blue open triangle A. */
export const HAT_LOGO = {
  grey: [
    [[0, 0], [0.22, 0], [0.22, 1], [0, 1]],
    [[0.46, 0], [0.68, 0], [0.68, 1], [0.46, 1]],
    [[0.22, 0.4], [0.46, 0.4], [0.46, 0.6], [0.22, 0.6]],
    [[1.94, 0.78], [2.72, 0.78], [2.72, 1], [1.94, 1]],
    [[2.22, 0], [2.44, 0], [2.44, 0.78], [2.22, 0.78]],
  ] as [number, number][][],
  blue: { outer: [[0.8, 0], [1.86, 0], [1.33, 1.08]] as [number, number][], inner: [[1.06, 0.16], [1.6, 0.16], [1.33, 0.68]] as [number, number][] },
  width: 2.72,
};

export type MunichView = { fov: number; position: Vec3; target: Vec3 };
/** Desktop keeps the left third for the story; portrait stacks helicopter, skyline and Alps above it. */
export function munichView(width: number, height: number): MunichView {
  const aspect = width / Math.max(1, height);
  if (width < 700 || aspect < 0.9) return { fov: 58, position: [-36, 52, 58], target: [-7, 22, -2] };
  return { fov: 40, position: [-36, 47, 50], target: [4, 33.5, -30] };
}
export function munichCamera(view: MunichView, excursion: number, sway: [number, number]) {
  const [px, py, pz] = view.position, [tx, ty, tz] = view.target;
  return {
    position: [px + sway[0] * 2.5, py + excursion * 90 + sway[1] * 1.2, pz + excursion * 30] as Vec3,
    target: [tx + sway[0] * 0.8, ty + excursion * 20, tz] as Vec3,
  };
}

export function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
