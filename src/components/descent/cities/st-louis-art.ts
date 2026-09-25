export const ST_LOUIS_ART = {
  archAspect: 6 / 7,
  desktop: {
    arch: "/images/cities/st-louis/arch-render.webp",
    clouds: "/images/cities/st-louis/cloud-bank.webp",
  },
  mobile: {
    arch: "/images/cities/st-louis/arch-render-mobile.webp",
    clouds: "/images/cities/st-louis/cloud-bank-mobile.webp",
  },
};

export function stLouisComposition(width: number, height: number) {
  const aspect = width / Math.max(height, 1), mobile = width < 700;
  return {
    arch: {
      x: mobile ? 0.5 : 0.7,
      y: mobile ? 0.25 : 0.44,
      height: Math.min(mobile ? 0.45 : 0.98, aspect * (mobile ? 0.88 : 0.57) / ST_LOUIS_ART.archAspect),
    },
    clouds: mobile ? [
      { x: 0.55, y: 0.38, width: 1.8 },
      { x: 0.5, y: 0.48, width: 2.05 },
      { x: 0.65, y: 0.56, width: 1.9 },
    ] : [
      { x: 0.72, y: 0.68, width: 1.45 },
      { x: 0.73, y: 0.88, width: 1.55 },
      { x: 0.48, y: 1.02, width: 1.45 },
    ],
  };
}

type Vec3 = [number, number, number];

/**
 * Point-cloud St. Louis seen from the Illinois bank: the Gateway Arch over the Mississippi, the Stars and Stripes
 * beneath it, the Old Courthouse dome framed by the legs, downtown and Busch Stadium. One unit is about three metres.
 */
export const ARCH = { height: 64, span: 64, k: 2.5 };
/** Catenary centre line for t ∈ [−1, 1]. */
export function archCentre(t: number): [number, number] {
  const { height, span, k } = ARCH;
  return [span / 2 * t, height * (Math.cosh(k) - Math.cosh(k * t)) / (Math.cosh(k) - 1)];
}
/** Width of the equilateral cross-section: about 16.5 m at the feet, 5.2 m at the top. */
export const archSide = (heightFraction: number) => 5.5 + (1.7 - 5.5) * Math.min(1, Math.max(0, heightFraction));

/** Stations every `spacing` along the arc; each samples the triangular section, outer edge pointing away from the span. */
export function sampleArch(spacing = 0.42) {
  const line: [number, number][] = Array.from({ length: 1601 }, (_, i) => archCentre(-1 + i / 800));
  const points: { position: Vec3; normal: Vec3; height: number }[] = [];
  let carried = 0;
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1], [x1, y1] = line[i], length = Math.hypot(x1 - x0, y1 - y0);
    carried += length;
    if (carried < spacing) continue;
    carried = 0;
    const tx = (x1 - x0) / length, ty = (y1 - y0) / length;
    let ox = ty, oy = -tx;
    if (ox * x1 + oy * (y1 - ARCH.height * 0.35) < 0) { ox = -ox; oy = -oy; }
    const w = archSide(y1 / ARCH.height), r = w / Math.sqrt(3);
    const corners: Vec3[] = [
      [x1 + ox * r, y1 + oy * r, 0],
      [x1 - ox * r / 2, y1 - oy * r / 2, w / 2],
      [x1 - ox * r / 2, y1 - oy * r / 2, -w / 2],
    ];
    for (let e = 0; e < 3; e++) {
      const a = corners[e], b = corners[(e + 1) % 3], n = Math.max(2, Math.ceil(w / spacing));
      const mid = [(a[0] + b[0]) / 2 - x1, (a[1] + b[1]) / 2 - y1, (a[2] + b[2]) / 2], m = Math.hypot(...mid);
      for (let s = 0; s < n; s++) {
        const u = s / n;
        points.push({ position: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], normal: [mid[0] / m, mid[1] / m, mid[2] / m], height: y1 / ARCH.height });
      }
    }
  }
  return points;
}

/** The flag flies from a pole between the legs; the canton sits at the hoist, top left. */
export const FLAG = { x: -12, y: 15, z: 12, length: 24, height: 12.6 };
export type FlagPart = "red" | "white" | "blue" | "star";
export function sampleFlag(spacing = 0.42) {
  const { x, y, z, length, height } = FLAG, cantonW = length * 0.4, cantonH = height * 7 / 13;
  const points: { position: Vec3; part: FlagPart }[] = [];
  for (let u = 0; u <= length; u += spacing) for (let v = 0; v <= height; v += spacing) {
    const inCanton = u < cantonW && v > height - cantonH;
    const stripe = Math.min(12, Math.floor((height - v) / height * 13));
    points.push({ position: [x + u, y + v, z], part: inCanton ? "blue" : stripe % 2 === 0 ? "red" : "white" });
  }
  for (let row = 0; row < 9; row++) {
    const count = row % 2 ? 5 : 6;
    for (let c = 0; c < count; c++) {
      const u = cantonW * ((row % 2 ? 1 : 0.5) + c * 2) / 12, v = height - cantonH * (row + 1) / 10;
      points.push({ position: [x + u, y + v, z + 0.05], part: "star" });
    }
  }
  return points;
}

export function stLouisAssembly(arrivalT: number, departureT: number, reduced: boolean) {
  return reduced ? 1 : arrivalT * (1 - departureT);
}

export type StLouisView = { fov: number; position: Vec3; target: Vec3 };
/** Desktop leaves the left third to the story; portrait sets the arch above it. */
export function stLouisView(width: number, height: number): StLouisView {
  const aspect = width / Math.max(1, height);
  if (width < 700 || aspect < 0.9) return { fov: 56, position: [-8, 5, 190], target: [0, -6, 0] };
  return { fov: 38, position: [-72, 9, 175], target: [-4, 31, 0] };
}
export function stLouisCamera(view: StLouisView, excursion: number, sway: [number, number]) {
  const [px, py, pz] = view.position, [tx, ty, tz] = view.target;
  return {
    position: [px + sway[0] * 6, py + excursion * 70 + sway[1] * 3, pz + excursion * 40] as Vec3,
    target: [tx + sway[0] * 1.5, ty + excursion * 10, tz] as Vec3,
  };
}
