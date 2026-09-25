/**
 * The Carlos Mata mark: an isometric cube whose faces hide a C and an M (QuiverAI, `42-hidden-cm-cube`).
 * The same two paths feed the inline SVG fallback and the WebGL point cloud of the intro.
 */
export const LOGO = {
  viewBox: 40,
  paths: [
    "m8.68 16.22 4.2 2.25v-2.23l-6.69-3.71v17.34l11.44 6.58v-2.73l-8.95-5.13v-12.37z",
    "m33.77 11.25-13.86-7.77-12.88 7.15 2.31 1.29 10.58-5.79 10.99 6.21-9.48 5.51v1.89l9.22 5.13-9.92 6.1v2.51l12.99-7.65v-1.92l-9.2-5.13 9.25-5.48v-2.05z",
  ],
};

type Point = [number, number];

/** Parses the straight-line subset of SVG path data used by the mark (M, L, H, V, Z, absolute or relative). */
export function parsePath(d: string): Point[][] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const polygons: Point[][] = [];
  let current: Point[] = [], x = 0, y = 0, command = "", i = 0;
  const number = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
    const relative = command === command.toLowerCase();
    switch (command.toLowerCase()) {
      case "m": case "l": {
        const dx = number(), dy = number();
        x = relative ? x + dx : dx; y = relative ? y + dy : dy;
        if (command.toLowerCase() === "m") { if (current.length) polygons.push(current); current = []; command = relative ? "l" : "L"; }
        current.push([x, y]);
        break;
      }
      case "h": { const v = number(); x = relative ? x + v : v; current.push([x, y]); break; }
      case "v": { const v = number(); y = relative ? y + v : v; current.push([x, y]); break; }
      case "z": if (current.length) { polygons.push(current); x = current[0][0]; y = current[0][1]; current = []; } break;
      default: i++;
    }
  }
  if (current.length) polygons.push(current);
  return polygons;
}

export function insidePolygon([px, py]: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export type LogoSample = { position: [number, number, number]; edge: boolean; part: number };

/**
 * Fills both paths on a jittered grid and traces their outlines, repeated over a few depth layers so the mark
 * has real thickness when it tilts. Positions are centred, y up, and normalised to a cap height of 1.
 */
export function sampleLogo(spacing = 0.3, layers = 4, depth = 1.6, rng = Math.random) {
  const polygons = LOGO.paths.map(parsePath).map(p => p[0]);
  const all = polygons.flat(), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, unit = 1 / (maxY - minY);
  const flat: { x: number; y: number; edge: boolean; part: number }[] = [];
  polygons.forEach((polygon, part) => {
    for (let x = minX; x <= maxX; x += spacing) for (let y = minY; y <= maxY; y += spacing) {
      const p: Point = [x + (rng() - 0.5) * spacing * 0.08, y + (rng() - 0.5) * spacing * 0.08];
      if (insidePolygon(p, polygon)) flat.push({ x: p[0], y: p[1], edge: false, part });
    }
    polygon.forEach((a, i) => {
      const b = polygon[(i + 1) % polygon.length], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (spacing * 0.45)));
      for (let s = 0; s < steps; s++) flat.push({ x: a[0] + (b[0] - a[0]) * s / steps, y: a[1] + (b[1] - a[1]) * s / steps, edge: true, part });
    });
  });
  const samples: LogoSample[] = [];
  for (let layer = 0; layer < layers; layer++) {
    const z = layers > 1 ? (layer / (layers - 1) - 0.5) * depth : 0;
    for (const f of flat) {
      if (!f.edge && layer > 0) continue;
      samples.push({ position: [(f.x - cx) * unit, (cy - f.y) * unit, f.edge ? z * unit : depth * 0.5 * unit], edge: f.edge, part: f.part });
    }
  }
  return { samples, aspect: (maxX - minX) / (maxY - minY) };
}

/** Pixel layout of the mark, shared by the WebGL logo and the CSS fallback: centre at 40% height. */
export function logoLayout(width: number, height: number) {
  const size = Math.min(height * 0.44, width * 0.62);
  return { size, centreY: height * 0.4 };
}
