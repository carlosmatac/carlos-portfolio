/**
 * Madrid as data: the Cuatro Torres built from floor-by-floor point samples, ETL pipelines feeding them,
 * traffic streaming along the Castellana and an embedding space of clustered points in the sky.
 * Pure helpers shared by the scene and its tests. One unit is roughly four metres.
 */
type Vec3 = [number, number, number];

export function random(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const superellipse = (angle: number, a: number, b: number, n: number) =>
  Math.pow(Math.pow(Math.abs(Math.cos(angle) / a), n) + Math.pow(Math.abs(Math.sin(angle) / b), n), -1 / n);

/**
 * Four distinct silhouettes, north to south along the Castellana:
 * Cepsa's open arch crown, PwC's trilobed tapering plan, Cristal's slanted glass crown, Emperador's square-to-lens twist.
 */
export type Tower = {
  name: string; x: number; z: number; height: number;
  radius: (h: number, angle: number) => number;
  keep: (h: number, x: number, z: number) => boolean;
};
export const TOWERS: Tower[] = [
  {
    name: "Torre_Cepsa", x: -33, z: -4, height: 62,
    radius: (_h, a) => superellipse(a, 5.6, 4.1, 12),
    keep: (h, x) => !(h > 0.78 && h < 0.94 && Math.abs(x) < 3.4),
  },
  {
    name: "Torre_PwC", x: -11, z: 4, height: 59,
    radius: (h, a) => (5.6 + 0.8 * Math.cos(3 * a)) * (1 - 0.1 * h),
    keep: (h, x, z) => h < 0.93 || Math.round((Math.atan2(z, x) + Math.PI) * 6) % 2 === 0,
  },
  {
    name: "Torre_de_Cristal", x: 11, z: -3, height: 63,
    radius: (_h, a) => Math.min(superellipse(a, 5, 5, 14), 7.4 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a)))),
    keep: (h, x) => h * 63 <= 59 + x * 0.55,
  },
  {
    name: "Torre_Emperador", x: 33, z: 5, height: 56,
    radius: (h, a) => superellipse(a + h * 0.5, 5.2, 5.2 - 1.6 * h, 10 - 8 * h),
    keep: () => true,
  },
];

export type Sample = { position: Vec3; normal: Vec3; lit: boolean; tower: number };
/** Floor rings every unit of height, roughly 0.55 units apart along the façade. */
export function sampleTowers(seed = 7): Sample[] {
  const rng = random(seed), points: Sample[] = [];
  TOWERS.forEach((tower, index) => {
    for (let floor = 0; floor <= tower.height; floor++) {
      const h = floor / tower.height, around = 2 * Math.PI * tower.radius(h, 0);
      const count = Math.max(24, Math.round(around / 0.55));
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2, r = tower.radius(h, angle);
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
        if (!tower.keep(h, x, z)) continue;
        points.push({ position: [tower.x + x, floor, tower.z + z], normal: [Math.cos(angle), 0, Math.sin(angle)], lit: rng() < 0.11, tower: index });
      }
    }
  });
  return points;
}

/** Embedding clusters floating above the skyline. */
export const CLUSTERS: { centre: Vec3; spread: number; colour: Vec3 }[] = [
  { centre: [-24, 120, -90], spread: 6, colour: [0.62, 0.48, 1.0] },
  { centre: [22, 146, -110], spread: 7, colour: [0.35, 0.85, 1.0] },
  { centre: [68, 116, -80], spread: 5.5, colour: [1.0, 0.62, 0.3] },
  { centre: [118, 150, -120], spread: 8, colour: [1.0, 0.45, 0.7] },
  { centre: [-66, 156, -140], spread: 7, colour: [0.45, 1.0, 0.8] },
  { centre: [156, 110, -70], spread: 6, colour: [0.62, 0.48, 1.0] },
  { centre: [62, 178, -160], spread: 9, colour: [0.35, 0.85, 1.0] },
];
export function sampleEmbeddings(count: number, seed = 11) {
  const rng = random(seed), gauss = () => Math.sqrt(-2 * Math.log(rng() + 1e-9)) * Math.cos(2 * Math.PI * rng());
  return Array.from({ length: count }, (_, i) => {
    const cluster = CLUSTERS[i % CLUSTERS.length];
    const spread = rng() < 0.18 ? cluster.spread * 4 : cluster.spread;
    return { position: cluster.centre.map(c => c + gauss() * spread) as Vec3, cluster: i % CLUSTERS.length };
  });
}

/**
 * k nearest projected points within a radius, nearest first. Points are [x, y] in pixels.
 * `spacing` skips candidates closer than that to an already chosen result, so the top-k spreads out visibly.
 */
export function nearest(points: Float32Array, mouse: [number, number], k: number, radius: number, spacing = 0) {
  const candidates: { index: number; distance: number }[] = [];
  for (let i = 0; i < points.length / 2; i++) {
    const d = Math.hypot(points[i * 2] - mouse[0], points[i * 2 + 1] - mouse[1]);
    if (d <= radius) candidates.push({ index: i, distance: d });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const found: typeof candidates = [];
  for (const c of candidates) {
    if (found.length === k) break;
    if (spacing && found.some(f => Math.hypot(points[f.index * 2] - points[c.index * 2], points[f.index * 2 + 1] - points[c.index * 2 + 1]) < spacing)) continue;
    found.push(c);
  }
  return found;
}

/** Cubic Bézier pipelines: ground sources into the towers, tower to tower, and up into the embedding space. */
export function pipelines(): [Vec3, Vec3, Vec3, Vec3][] {
  const top = (i: number, f = 0.9): Vec3 => [TOWERS[i].x, TOWERS[i].height * f, TOWERS[i].z];
  return [
    [[-120, 0, 60], [-90, 30, 40], [-50, 50, 10], top(0, 0.5)],
    [[-100, 0, -90], [-70, 40, -60], [-30, 60, -30], top(1, 0.6)],
    [[140, 0, 70], [100, 30, 40], [50, 50, 10], top(3, 0.5)],
    [[120, 0, -110], [80, 45, -70], [30, 60, -30], top(2, 0.55)],
    [top(0, 0.97), [-20, 70, -2], [-14, 70, 2], top(1, 0.97)],
    [top(1, 0.97), [-2, 72, 1], [4, 72, -1], top(2, 0.9)],
    [top(2, 0.9), [16, 70, 0], [22, 68, 3], top(3, 0.98)],
    [top(0, 1), [-34, 80, -20], [-40, 90, -45], CLUSTERS[0].centre],
    [top(2, 0.95), [10, 82, -30], [8, 100, -60], CLUSTERS[1].centre],
    [top(3, 1), [40, 78, -20], [50, 90, -50], CLUSTERS[2].centre],
  ];
}

/** Assembly of the skyline from scattered points while landing; 1 at rest. Lower floors settle first. */
export function assembly(arrivalT: number, departureT: number, reduced: boolean) {
  return reduced ? 1 : arrivalT * (1 - departureT);
}

export type MadridView = { fov: number; position: Vec3; target: Vec3 };
export function madridView(width: number, height: number): MadridView {
  const aspect = width / Math.max(1, height);
  if (width < 700 || aspect < 0.9) return { fov: 56, position: [-30, 8, 230], target: [4, 30, -10] };
  return { fov: 38, position: [-120, 16, 190], target: [-4, 66, -10] };
}
export function madridCamera(view: MadridView, excursion: number, sway: [number, number]) {
  const [px, py, pz] = view.position, [tx, ty, tz] = view.target;
  return {
    position: [px + sway[0] * 6, py + excursion * 70 + sway[1] * 3, pz + excursion * 40] as Vec3,
    target: [tx + sway[0] * 1.5, ty + excursion * 10, tz] as Vec3,
  };
}
