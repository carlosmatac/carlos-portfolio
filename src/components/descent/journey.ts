import { clamp01, smoothstep } from "./easing";
import { JOURNEY, sampleJourney } from "./journey-timeline";
export { clamp01, smoothstep } from "./easing";

/**
 * The entrance: the camera pushes into the point-cloud logo, which bursts past it; a flash opens a warp tunnel
 * that brakes progressively until the Earth fills the view. The rest of the scroll travels the Earth.
 */
export function journeyAt(progress: number, reducedMotion = false) {
  const p = clamp01(progress);
  const timeline = sampleJourney(p * JOURNEY.totalH, JOURNEY, reducedMotion);
  const intro = timeline.introT;
  const zoom = smoothstep(0, 0.32, intro);
  const fall = clamp01((intro - 0.32) / 0.56);
  const identity = 1 - smoothstep(0.02, 0.14, intro);
  const speed = Math.pow(1 - fall, 3) * smoothstep(0.15, 0.32, intro);
  return {
    progress: p,
    zoom: reducedMotion ? 0 : zoom,
    fall,
    distance: reducedMotion ? 0 : 1 - Math.pow(1 - fall, 4),
    speed: reducedMotion ? 0 : speed,
    identity,
    prompt: 1 - smoothstep(0.01, 0.07, intro),
    /** The logo's points fly outwards and past the camera. */
    burst: reducedMotion ? 0 : smoothstep(0.05, 0.36, intro),
    logo: reducedMotion ? identity : 1 - smoothstep(0.3, 0.42, intro),
    /** A brief white-blue bloom where the logo was, as the warp opens. */
    flash: reducedMotion ? 0 : smoothstep(0.13, 0.26, intro) * (1 - smoothstep(0.26, 0.44, intro)),
    stars: reducedMotion ? 0 : smoothstep(0.08, 0.26, intro),
    earth: timeline.earth,
    timeline,
  };
}
export type JourneyFrame = ReturnType<typeof journeyAt>;
