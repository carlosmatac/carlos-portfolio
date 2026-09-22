import { clamp01, smoothstep } from "./easing";
import { earthAt, INTRO_END } from "./earth-journey";
export { clamp01, smoothstep } from "./easing";

/** The entrance remains the same; the rest of the scroll now travels the Earth. */
export function journeyAt(progress: number, reducedMotion = false) {
  const p = clamp01(progress);
  const intro = clamp01(p / INTRO_END);
  const zoom = smoothstep(0, 0.32, intro);
  const fall = clamp01((intro - 0.32) / 0.56);
  return {
    progress: p,
    zoom: reducedMotion ? 0 : zoom,
    fall,
    distance: reducedMotion ? 0 : 1 - Math.pow(1 - fall, 4),
    speed: reducedMotion ? 0 : Math.pow(1 - fall, 3) * smoothstep(0.30, 0.37, intro),
    identity: 1 - smoothstep(0.15, 0.29, intro),
    prompt: 1 - smoothstep(0.015, 0.10, intro),
    screen: 1 - smoothstep(0.27, 0.35, intro),
    stars: reducedMotion ? 0 : smoothstep(0.29, 0.38, intro),
    earth: earthAt(p, reducedMotion),
  };
}
export type JourneyFrame = ReturnType<typeof journeyAt>;
