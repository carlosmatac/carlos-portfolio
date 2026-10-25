/**
 * The intro's backdrop: a grid of short strokes combed by a slow flow field. Near the cursor (or a wandering
 * attractor when there is none) they swirl around it, lengthen and light up. As the journey starts they turn
 * radially towards the Earth and stretch, like a jump to light speed.
 * Drawn on a 2D canvas so it costs little on phones and runs without WebGL.
 */

export type Point2 = { x: number; y: number };
export type PatternInput = {
  width: number; height: number; seconds: number;
  /** Where the strokes swirl, and how strongly (0..1). */
  focus: Point2; pull: number;
  /** 0: combed by the flow field; 1: radial, stretched towards `centre`. */
  warp: number;
  centre: Point2;
};

export function patternMetrics(width: number, height: number) {
  const short = Math.min(width, height);
  const spacing = Math.round(Math.min(46, Math.max(26, short * 0.048)));
  return { spacing, length: spacing * 0.34, radius: Math.max(150, short * 0.3) };
}

const BUCKETS = 12;

/**
 * Every stroke as x1, y1, x2, y2, alpha. Angles are blended as doubled vectors, since a stroke reads the same
 * both ways round.
 */
export function patternSegments(input: PatternInput, out?: Float32Array) {
  const { width, height, seconds: t, focus, pull, warp, centre } = input;
  const { spacing, length, radius } = patternMetrics(width, height);
  const cols = Math.ceil(width / spacing) + 1, rows = Math.ceil(height / spacing) + 1;
  const ox = (width - (cols - 1) * spacing) / 2, oy = (height - (rows - 1) * spacing) / 2;
  const reach = Math.hypot(width, height) / 2;
  const segments = out && out.length >= cols * rows * 5 ? out : new Float32Array(cols * rows * 5);
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ox + c * spacing, y = oy + r * spacing;
    // Slow combing field.
    const flow = Math.sin(x * 0.0036 + t * 0.16) * 1.3 + Math.cos(y * 0.0042 - t * 0.12) * 1.1 + Math.sin((x + y) * 0.0017 + t * 0.07);
    let ax = Math.cos(flow * 2), ay = Math.sin(flow * 2);
    // Swirl around the focus.
    const fx = x - focus.x, fy = y - focus.y, d = Math.hypot(fx, fy);
    const k = pull * Math.exp(-((d / radius) ** 2));
    const swirl = Math.atan2(fy, fx) + Math.PI / 2;
    ax = ax * (1 - k) + Math.cos(swirl * 2) * k * 1.6;
    ay = ay * (1 - k) + Math.sin(swirl * 2) * k * 1.6;
    // Warp: radial from the centre.
    const cx = x - centre.x, cy = y - centre.y, dc = Math.hypot(cx, cy);
    const radial = Math.atan2(cy, cx);
    const w = warp * warp * (3 - 2 * warp);
    ax = ax * (1 - w) + Math.cos(radial * 2) * w * 3;
    ay = ay * (1 - w) + Math.sin(radial * 2) * w * 3;
    const angle = Math.atan2(ay, ax) / 2;
    const band = Math.max(0, Math.sin((x * 0.8 + y) * 0.0038 - t * 0.7)) ** 10;
    const half = length * (1 + k * 0.9 + band * 0.25) * (1 + w * (0.4 + 5 * dc / reach)) / 2;
    const dx = Math.cos(angle) * half, dy = Math.sin(angle) * half;
    segments[n++] = x - dx; segments[n++] = y - dy; segments[n++] = x + dx; segments[n++] = y + dy;
    segments[n++] = Math.min(1, 0.13 + 0.07 * Math.sin(c * 1.7 + r * 2.3) ** 2 + k * 0.7 + band * 0.22 + w * 0.35 * dc / reach);
  }
  return segments.subarray(0, n);
}

export function createIntroPattern(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  let width = 1, height = 1, ratio = 1, buffer: Float32Array | undefined, cleared = false;
  const focus = { x: 0, y: 0 }, pointer = { x: 0, y: 0, seen: -Infinity, down: false, touch: false };
  let pull = 0, started = false;
  const now = () => performance.now() / 1000;
  const onMove = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top;
    pointer.touch = event.pointerType === "touch";
    pointer.seen = now();
  };
  const onDown = (event: PointerEvent) => { pointer.down = true; onMove(event); };
  const onUp = () => { pointer.down = false; };
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });

  return {
    resize(w: number, h: number) {
      width = Math.max(1, w); height = Math.max(1, h);
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      cleared = false;
    },
    update(frame: { seconds: number; dt: number; opacity: number; warp: number; reduced: boolean }) {
      if (!context) return;
      if (frame.opacity < 0.002) {
        if (!cleared) { context.clearRect(0, 0, canvas.width, canvas.height); cleared = true; }
        return;
      }
      cleared = false;
      const t = frame.reduced ? 0 : frame.seconds;
      // A real pointer leads; without one (touch screens, a resting mouse) a slow attractor wanders the page.
      const live = !frame.reduced && now() - pointer.seen < 2.5 && (!pointer.touch || pointer.down);
      const wander = { x: width * (0.5 + 0.3 * Math.sin(t * 0.21)), y: height * (0.45 + 0.25 * Math.sin(t * 0.33 + 1)) };
      const goal = live ? pointer : wander;
      if (!started) { focus.x = goal.x; focus.y = goal.y; started = true; }
      const ease = 1 - Math.exp(-frame.dt / (live ? 0.12 : 0.8));
      focus.x += (goal.x - focus.x) * ease; focus.y += (goal.y - focus.y) * ease;
      pull += ((frame.reduced ? 0 : live ? 1 : 0.55) - pull) * (1 - Math.exp(-frame.dt / 0.5));
      buffer = patternSegments({
        width, height, seconds: t, focus, pull: pull * (1 - frame.warp), warp: frame.warp,
        centre: { x: width / 2, y: height / 2 },
      }, buffer);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.lineCap = "round";
      // Strokes are batched by brightness: a dozen paths instead of a thousand.
      for (let b = 0; b < BUCKETS; b++) {
        const low = b / BUCKETS, high = (b + 1) / BUCKETS;
        context.beginPath();
        let any = false;
        for (let i = 0; i < buffer.length; i += 5) {
          const a = buffer[i + 4];
          if (a < low || a >= high && b < BUCKETS - 1) continue;
          context.moveTo(buffer[i], buffer[i + 1]); context.lineTo(buffer[i + 2], buffer[i + 3]);
          any = true;
        }
        if (!any) continue;
        const alpha = (low + high) / 2;
        context.lineWidth = 1 + alpha * 1.1;
        context.strokeStyle = `rgba(236, 238, 245, ${(alpha * frame.opacity).toFixed(3)})`;
        context.stroke();
      }
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    },
  };
}
