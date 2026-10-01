/**
 * Streamers that swim around the intro: always moving, steering around the logo and fleeing the cursor (or the
 * finger on touch screens). A hard clearance is applied last, so no point of any streamer is ever closer to the
 * pointer than `clearance`. As the journey starts they swim onto great circles around the globe.
 * Drawn on a 2D canvas: cheap on phones and independent of the WebGL scene.
 */

export type Point2 = { x: number; y: number };
export type Disc = Point2 & { r: number };
/** A disc stretched downwards by `length`: the logo with the name beneath it. */
export type Capsule = Disc & { length: number };
export type WormsInput = {
  width: number; height: number; dt: number; seconds: number;
  pointer: Point2 | null;
  logo: Capsule;
  /** 0: free swimming, 1: wrapped around the globe. */
  gather: number;
  globe: Disc;
};

const PALETTE: [string, string][] = [
  ["#8b7bff", "#ff7ac6"], ["#ff8a5c", "#ffd36e"], ["#3fd0c4", "#5aa9ff"], ["#ff6fae", "#8b7bff"], ["#ffd36e", "#3fd0c4"],
  ["#5aa9ff", "#b69cff"], ["#ff7a59", "#ff6fae"], ["#9be15d", "#3fd0c4"], ["#e5d3ae", "#ff8a5c"],
];
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const angleTo = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * t * (t * (t * 6 - 15) + 10); };

export type Worm = {
  sim: Float32Array; view: Float32Array; depth: Float32Array;
  heading: number; freq: [number, number]; offset: [number, number]; turn: number; speed: number; width: number;
  head: number[]; tail: number[];
  /** The great circle it wraps onto: an orthonormal basis and a starting angle. */
  u: [number, number, number]; v: [number, number, number]; orbit: number; spin: 1 | -1;
};
export type WormField = { worms: Worm[]; points: number; spacing: number; width: number; height: number };

export function wormMetrics(width: number, height: number) {
  const short = Math.min(width, height), compact = width < 700;
  return {
    count: compact ? 6 : 9,
    points: compact ? 30 : 40,
    spacing: Math.max(6, short * 0.0105),
    thickness: compact ? 5 : 7,
    /** No streamer point is ever this close to the pointer. */
    clearance: Math.max(56, short * 0.085),
    flee: Math.max(170, short * 0.26),
    speed: Math.max(70, short * 0.12),
  };
}

export function createWormField(width: number, height: number, seed = 20251): WormField {
  let s = seed;
  const random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const m = wormMetrics(width, height);
  const worms = Array.from({ length: m.count }, (_, i): Worm => {
    const heading = random() * Math.PI * 2, x = width * (0.1 + random() * 0.8), y = height * (0.1 + random() * 0.8);
    const sim = new Float32Array(m.points * 2);
    for (let j = 0; j < m.points; j++) {
      sim[j * 2] = x - Math.cos(heading) * j * m.spacing;
      sim[j * 2 + 1] = y - Math.sin(heading) * j * m.spacing;
    }
    // Great circles spread over the sphere (golden-angle normals), each with its own direction of travel.
    const k = (i + 0.5) / m.count, polar = Math.acos(1 - 2 * k), azimuth = i * 2.39996;
    const n = [Math.sin(polar) * Math.cos(azimuth), Math.cos(polar), Math.sin(polar) * Math.sin(azimuth)];
    const a = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u0 = [n[1] * a[2] - n[2] * a[1], n[2] * a[0] - n[0] * a[2], n[0] * a[1] - n[1] * a[0]];
    const ul = Math.hypot(...u0), u = u0.map(c => c / ul) as [number, number, number];
    const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]] as [number, number, number];
    const [head, tail] = PALETTE[i % PALETTE.length];
    return {
      sim, view: sim.slice(), depth: new Float32Array(m.points), heading,
      freq: [0.35 + random() * 0.45, 0.9 + random() * 0.8], offset: [random() * 10, random() * 10],
      turn: 1.1 + random() * 0.9, speed: m.speed * (0.8 + random() * 0.45), width: m.thickness * (0.8 + random() * 0.45),
      head: rgb(head), tail: rgb(tail), u, v, orbit: random() * Math.PI * 2, spin: i % 2 ? 1 : -1,
    };
  });
  return { worms, points: m.points, spacing: m.spacing, width, height };
}

/** Pushes every point of `buffer` out to `clearance` from the pointer. */
export function keepClear(buffer: Float32Array, pointer: Point2 | null, clearance: number) {
  if (!pointer) return;
  for (let j = 0; j < buffer.length; j += 2) {
    const dx = buffer[j] - pointer.x, dy = buffer[j + 1] - pointer.y, d = Math.hypot(dx, dy);
    if (d >= clearance) continue;
    const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
    buffer[j] = pointer.x + nx * clearance; buffer[j + 1] = pointer.y + ny * clearance;
  }
}

function swim(field: WormField, worm: Worm, input: WormsInput, m: ReturnType<typeof wormMetrics>, dt: number) {
  const { sim } = worm;
  const hx = sim[0], hy = sim[1], t = input.seconds;
  let turn = (Math.sin(t * worm.freq[0] + worm.offset[0]) * 0.9 + Math.sin(t * worm.freq[1] + worm.offset[1]) * 0.55) * worm.turn;
  let speed = worm.speed;
  const steer = (towards: number, weight: number) => { turn += angleTo(worm.heading, towards) * weight; };
  // Stay on screen.
  const margin = Math.min(input.width, input.height) * 0.08;
  if (hx < margin || hx > input.width - margin || hy < margin || hy > input.height - margin) {
    steer(Math.atan2(input.height / 2 - hy, input.width / 2 - hx), 2.6);
  }
  // Swim around the logo and the name rather than over them.
  const { logo } = input, ly0 = Math.min(Math.max(hy, logo.y), logo.y + logo.length);
  const lx = hx - logo.x, ly = hy - ly0, ld = Math.hypot(lx, ly), around = logo.r * 1.3;
  if (ld < around) steer(Math.atan2(ly, lx), 6 * (1 - ld / around));
  // Flee the pointer, faster the closer it gets.
  let limit = 4.2;
  if (input.pointer) {
    const px = hx - input.pointer.x, py = hy - input.pointer.y, pd = Math.hypot(px, py);
    if (pd < m.flee) {
      const fear = 1 - pd / m.flee;
      steer(Math.atan2(py, px), 9 * fear);
      speed *= 1 + 1.8 * fear;
      limit = 8;
    }
  }
  worm.heading += Math.max(-limit, Math.min(limit, turn)) * dt;
  sim[0] += Math.cos(worm.heading) * speed * dt;
  sim[1] += Math.sin(worm.heading) * speed * dt;
  // The body follows the head at a fixed spacing.
  for (let j = 2; j < sim.length; j += 2) {
    const dx = sim[j] - sim[j - 2], dy = sim[j + 1] - sim[j - 1], d = Math.hypot(dx, dy) || 1;
    sim[j] = sim[j - 2] + dx / d * field.spacing; sim[j + 1] = sim[j - 1] + dy / d * field.spacing;
  }
  keepClear(sim, input.pointer, m.clearance);
}

/** Advances the free swim, then blends each streamer onto its great circle by `gather`, head first. */
export function stepWorms(field: WormField, input: WormsInput) {
  const m = wormMetrics(input.width, input.height);
  const steps = Math.max(1, Math.ceil(input.dt / (1 / 60)));
  for (let s = 0; s < steps; s++) for (const worm of field.worms) swim(field, worm, input, m, Math.min(input.dt, 0.1) / steps);
  const radius = input.globe.r * 1.06, spin = input.seconds * 0.18, tilt = 0.38, arc = Math.PI * 1.05;
  const [cs, ss, ct, st] = [Math.cos(spin), Math.sin(spin), Math.cos(tilt), Math.sin(tilt)];
  for (const worm of field.worms) {
    const { sim, view, depth, u, v } = worm;
    for (let j = 0; j < field.points; j++) {
      const k = smooth(input.gather * 1.35 - (j / (field.points - 1)) * 0.35);
      let x = sim[j * 2], y = sim[j * 2 + 1], z = 0;
      if (k > 0) {
        const phi = worm.orbit + worm.spin * (input.seconds * 0.55 - (j / (field.points - 1)) * arc);
        const c = Math.cos(phi), sn = Math.sin(phi);
        const px = c * u[0] + sn * v[0], py = c * u[1] + sn * v[1], pz = c * u[2] + sn * v[2];
        const rx = px * cs + pz * ss, rz = -px * ss + pz * cs;
        const ry = py * ct - rz * st; z = py * st + rz * ct;
        x += (input.globe.x + rx * radius - x) * k;
        y += (input.globe.y - ry * radius - y) * k;
        z *= k;
      }
      view[j * 2] = x; view[j * 2 + 1] = y; depth[j] = z;
    }
    keepClear(view, input.pointer, m.clearance);
  }
}

/**
 * Each streamer is one tapered ribbon filled with a head-to-tail gradient: no overlapping strokes, so no beading.
 * On the globe the ribbon splits into front and back runs; the back dims, then hides behind the planet.
 */
export function drawWorms(ctx: CanvasRenderingContext2D, field: WormField, opacity: number, gather: number, planet: number, glow: boolean) {
  const n = field.points, left = new Float32Array(n * 2), right = new Float32Array(n * 2);
  const hidden = 0.55 + 0.45 * planet;
  for (const worm of field.worms) {
    const { view, depth } = worm;
    const ribbon = (scale: number) => {
      for (let j = 0; j < n; j++) {
        const a = Math.max(0, j - 1), b = Math.min(n - 1, j + 1);
        let tx = view[b * 2] - view[a * 2], ty = view[b * 2 + 1] - view[a * 2 + 1];
        const length = Math.hypot(tx, ty) || 1; tx /= length; ty /= length;
        const half = ((worm.width * (1 - j / (n - 1)) ** 0.55 + 0.7) * (1 - 0.45 * gather) / 2) * scale;
        left[j * 2] = view[j * 2] - ty * half; left[j * 2 + 1] = view[j * 2 + 1] + tx * half;
        right[j * 2] = view[j * 2] + ty * half; right[j * 2 + 1] = view[j * 2 + 1] - tx * half;
      }
    };
    const gradient = (alpha: number) => {
      const g = ctx.createLinearGradient(view[0], view[1], view[(n - 1) * 2], view[(n - 1) * 2 + 1]);
      const [hr, hg, hb] = worm.head, [tr, tg, tb] = worm.tail;
      g.addColorStop(0, `rgba(${hr},${hg},${hb},${alpha})`);
      g.addColorStop(0.55, `rgba(${(hr + tr) >> 1},${(hg + tg) >> 1},${(hb + tb) >> 1},${alpha * 0.8})`);
      g.addColorStop(1, `rgba(${tr},${tg},${tb},${alpha * 0.12})`);
      return g;
    };
    // Runs of consecutive points on the same side of the globe.
    const runs: [number, number, boolean][] = [];
    for (let j = 0, start = 0; j < n; j++) {
      const behind = depth[j] < -0.04;
      if (j === n - 1 || (depth[j + 1] < -0.04) !== behind) { runs.push([start, j, behind]); start = j; }
    }
    const fill = (from: number, to: number) => {
      ctx.beginPath();
      ctx.moveTo(left[from * 2], left[from * 2 + 1]);
      for (let j = from + 1; j <= to; j++) ctx.lineTo(left[j * 2], left[j * 2 + 1]);
      for (let j = to; j >= from; j--) ctx.lineTo(right[j * 2], right[j * 2 + 1]);
      ctx.closePath();
      ctx.fill();
    };
    for (const [scale, strength] of glow ? [[2.8, 0.13], [1, 1]] : [[1, 1]]) {
      ribbon(scale);
      for (const [from, to, behind] of runs) {
        const alpha = opacity * strength * (behind ? 1 - hidden : 1);
        if (alpha < 0.01) continue;
        ctx.fillStyle = gradient(alpha);
        fill(from, to);
      }
      // A rounded head.
      const head = (worm.width * (1 - 0.45 * gather) / 2 + 0.35) * scale;
      if (!(runs[0][2] && hidden > 0.99)) {
        ctx.fillStyle = gradient(opacity * strength * (runs[0][2] ? 1 - hidden : 1));
        ctx.beginPath(); ctx.arc(view[0], view[1], head, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

/** The canvas, its pointer tracking (mouse, pen and touch) and the per-frame update. */
export function createIntroWorms(host: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.className = "intro-worms";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let field: WormField | null = null, width = 0, height = 0, ratio = 1, drawn = false;
  let pointer: Point2 | null = null, releasedAt = Infinity;
  const place = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    releasedAt = Infinity;
  };
  const release = (event: PointerEvent) => { if (event.pointerType === "touch") releasedAt = performance.now(); };
  const leave = (event: PointerEvent) => { if (!event.relatedTarget && event.pointerType !== "touch") pointer = null; };
  window.addEventListener("pointermove", place, { passive: true });
  window.addEventListener("pointerdown", place, { passive: true });
  window.addEventListener("pointerup", release, { passive: true });
  window.addEventListener("pointercancel", release, { passive: true });
  document.addEventListener("pointerout", leave);
  return {
    resize(w: number, h: number) {
      ratio = Math.min(window.devicePixelRatio || 1, w < 700 ? 2 : 1.5);
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
      if (!field || Math.abs(w - width) > 80 || Math.abs(h - height) > 160) field = createWormField(w, h);
      field.width = w; field.height = h; width = w; height = h;
    },
    update(frame: { seconds: number; dt: number; opacity: number; gather: number; planet: number; logo: Capsule; globe: Disc }) {
      if (!ctx || !field) return;
      // A lifted finger keeps repelling briefly, so streamers do not snap back under it.
      if (pointer && performance.now() - releasedAt > 600) pointer = null;
      if (frame.opacity < 0.002) {
        if (drawn) { ctx.clearRect(0, 0, canvas.width, canvas.height); drawn = false; }
        canvas.style.visibility = "hidden";
        return;
      }
      canvas.style.visibility = "visible";
      stepWorms(field, { width, height, dt: frame.dt, seconds: frame.seconds, pointer, logo: frame.logo, gather: frame.gather, globe: frame.globe });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawWorms(ctx, field, frame.opacity, frame.gather, frame.planet, width >= 700);
      drawn = true;
    },
    dispose() {
      window.removeEventListener("pointermove", place);
      window.removeEventListener("pointerdown", place);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.removeEventListener("pointerout", leave);
      canvas.remove();
    },
  };
}
