/**
 * Procedural model of Granada seen from the Albaicín: Sabika hill with the Alhambra,
 * the Darro valley, the Albaicín slope and Sierra Nevada. Pure and deterministic so the
 * scene, tests and cursor picking share one source. Units are artistic (1 ≈ 14 m).
 */
type Vec3 = [number, number, number];

function hash(ix: number, iz: number) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x: number, z: number, octaves: number) {
  let sum = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) { sum += noise(x * f, z * f) * amp; f *= 2.03; amp *= 0.5; }
  return sum;
}
function ridged(x: number, z: number, octaves: number) {
  let sum = 0, amp = 0.55, f = 1, weight = 1;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * f + i * 17.3, z * f - i * 9.1));
    const s = n * n * weight;
    weight = Math.min(1, s * 1.6);
    sum += s * amp; f *= 2.1; amp *= 0.48;
  }
  return sum;
}
const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Crest line of the Sabika hill, running west (−x) to east (+x). */
export const ridgeZ = (x: number) => -2 + 0.06 * x;
/** Half width of the walled enclosure; the Alcazaba forms the narrow western prow. */
export function enclosureHalfWidth(x: number) {
  if (x < -25 || x > 31) return 0;
  const lens = Math.sqrt(Math.max(0, 1 - ((x - 3) / 28.5) ** 2));
  return (x < -12 ? 2.2 + (x + 25) * 0.22 : 5.2) * lens + 0.4;
}
function crest(x: number) {
  return smoothstep(-44, -24, x) * (1 - smoothstep(52, 80, x)) * (7.2 + 0.035 * (x + 24));
}
export function terrainHeight(x: number, z: number) {
  const across = z - ridgeZ(x);
  const hill = crest(x) * Math.exp(-((across / (across > 0 ? 7.5 : 11)) ** 2));
  const plateau = crest(x) > 0 ? Math.max(0, 1 - Math.abs(across) / Math.max(0.1, enclosureHalfWidth(x) + 1.2)) * 0.9 : 0;
  const cerroSol = 14 * Math.exp(-(((x - 72) / 30) ** 2) - (((z + 24) / 22) ** 2));
  const albaicin = Math.max(0, z - 21) * (0.14 * smoothstep(-110, -40, x) + 0.06);
  const detail = fbm(x * 0.09, z * 0.09, 4) * (0.5 + 0.25 * smoothstep(20, 60, z));
  const far = -z - 88;
  const massif = far <= 0 ? 0 : Math.exp(-(((x - 40) / 110) ** 2) - (((z + 330) / 70) ** 2)) + 0.6 * Math.exp(-(((x + 120) / 90) ** 2) - (((z + 360) / 70) ** 2));
  const warp = far <= 0 ? 0 : fbm(x * 0.004, z * 0.004, 3) * 40;
  const sierra = far <= 0 ? 0 : ridged((x + warp) * 0.011 + 3.1, (z - warp) * 0.011, 6) * (8 + 26 * smoothstep(40, 200, far) + 52 * massif) * smoothstep(0, 50, far)
    + 16 * massif;
  return hill + plateau + cerroSol + albaicin + detail + sierra;
}

export type GranadaBlock = {
  name: string; x: number; dz: number; w: number; d: number; h: number;
  kind: "tower" | "hall" | "palace" | "church";
  roof?: "flat" | "pitched" | "belfry";
  angle?: number;
};
/** Condensed plan. Heights are above local ground; dz is measured from the crest line. */
export const ALHAMBRA: readonly GranadaBlock[] = [
  { name: "Torre_de_la_Vela", x: -24.2, dz: 0.4, w: 1.76, d: 1.76, h: 4.41, kind: "tower", roof: "belfry" },
  { name: "Torre_del_Homenaje", x: -17.5, dz: -2.4, w: 1.49, d: 1.49, h: 5.1, kind: "tower" },
  { name: "Torre_Quebrada", x: -18.5, dz: 2.6, w: 1.32, d: 1.54, h: 3.83, kind: "tower" },
  { name: "Torre_de_las_Armas", x: -14.5, dz: 3.6, w: 1.1, d: 1.1, h: 3.13, kind: "tower" },
  { name: "Torre_de_Comares", x: -5, dz: 4.6, w: 2.53, d: 2.42, h: 7.08, kind: "tower" },
  { name: "Palacio_de_Comares", x: -5.5, dz: 0.9, w: 1.76, d: 3.58, h: 2.67, kind: "hall", roof: "pitched", angle: Math.PI / 2 },
  { name: "Patio_de_los_Leones", x: -0.5, dz: 1.6, w: 3.41, d: 2.31, h: 2.44, kind: "hall", roof: "pitched" },
  { name: "Mexuar", x: -9.5, dz: 2.6, w: 2.31, d: 1.43, h: 2.55, kind: "hall", roof: "pitched" },
  { name: "Torre_de_las_Damas", x: 3.8, dz: 5, w: 1.43, d: 1.21, h: 3.48, kind: "tower", roof: "pitched" },
  { name: "Palacio_de_Carlos_V", x: 3.6, dz: -2, w: 4.18, d: 4.18, h: 3.25, kind: "palace" },
  { name: "Santa_Maria", x: 10.5, dz: -1.6, w: 2.86, d: 1.54, h: 2.9, kind: "church", roof: "pitched" },
  { name: "Campanario", x: 13.4, dz: -1, w: 0.88, d: 0.88, h: 5.22, kind: "tower", roof: "pitched" },
  { name: "Torre_de_la_Cautiva", x: 13, dz: 5.4, w: 1.32, d: 1.32, h: 3.6, kind: "tower" },
  { name: "Torre_de_las_Infantas", x: 18.5, dz: 4.8, w: 1.43, d: 1.32, h: 3.83, kind: "tower" },
  { name: "Torre_de_los_Siete_Suelos", x: 16, dz: -4.4, w: 1.32, d: 1.32, h: 3.36, kind: "tower" },
  { name: "Torre_del_Cabo", x: 24.5, dz: 3.4, w: 1.21, d: 1.21, h: 3.25, kind: "tower" },
  { name: "Torre_de_la_Justicia", x: -2, dz: -5.2, w: 1.43, d: 1.43, h: 3.71, kind: "tower" },
  { name: "Generalife_Pabellon_Norte", x: 58, dz: 0.8, w: 1.87, d: 1.32, h: 2.44, kind: "hall", roof: "pitched" },
  { name: "Generalife_Pabellon_Sur", x: 50, dz: 0.2, w: 1.65, d: 1.32, h: 1.97, kind: "hall", roof: "pitched" },
  { name: "Generalife_Torre", x: 59.8, dz: 2, w: 0.99, d: 0.99, h: 3.36, kind: "tower", roof: "pitched" },
];

/** Deterministic PRNG for instancing layouts. */
export function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export type GranadaView = { fov: number; position: Vec3; target: Vec3 };
/** Desktop keeps the left third quiet for the story; portrait lifts the Alcazaba above the text. */
export function granadaView(width: number, height: number): GranadaView {
  const aspect = width / Math.max(1, height);
  if (width < 700 || aspect < 0.9) return { fov: 50, position: [-12, 23, 100], target: [-6, -9, -14] };
  return { fov: 40, position: [-22, 14.5, 74], target: [-11, 11.5, -6] };
}

/** Where the arrival and departure excursions place the camera, in scene units. */
export function granadaCamera(view: GranadaView, excursion: number, sway: [number, number]) {
  const [px, py, pz] = view.position, [tx, ty, tz] = view.target;
  return {
    position: [px + sway[0] * 3.4, py + excursion * 52 - sway[1] * 1.8, pz + excursion * 26] as Vec3,
    target: [tx + sway[0] * 0.6, ty + excursion * 36, tz] as Vec3,
  };
}

/** Night patrol of the lantern along the northern wall when no cursor is present. */
export function patrolPoint(seconds: number): Vec3 {
  const x = 2 + 21 * Math.sin(seconds * 0.07);
  const z = ridgeZ(x) + enclosureHalfWidth(x) + 1.5;
  return [x, terrainHeight(x, z) + 2.5, z];
}

/** First intersection of a ray with the terrain, or null if it escapes into the sky. */
export function marchTerrain(origin: Vec3, direction: Vec3, maxDistance = 480): Vec3 | null {
  let t = 0.5, previous = 0;
  for (let i = 0; i < 400 && t < maxDistance; i++) {
    const x = origin[0] + direction[0] * t, y = origin[1] + direction[1] * t, z = origin[2] + direction[2] * t;
    if (y < terrainHeight(x, z)) {
      let lo = previous, hi = t;
      for (let k = 0; k < 10; k++) {
        const mid = (lo + hi) / 2;
        const mx = origin[0] + direction[0] * mid, my = origin[1] + direction[1] * mid, mz = origin[2] + direction[2] * mid;
        if (my < terrainHeight(mx, mz)) hi = mid; else lo = mid;
      }
      return [origin[0] + direction[0] * hi, origin[1] + direction[1] * hi, origin[2] + direction[2] * hi];
    }
    previous = t;
    t += Math.max(0.35, t * 0.018);
  }
  return null;
}
