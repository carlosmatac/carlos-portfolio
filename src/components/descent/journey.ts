import { clamp01 } from "./easing";
import { JOURNEY, sampleJourney } from "./journey-timeline";
import { flightEase, smootherRange } from "./motion";
export { clamp01, smoothstep } from "./easing";

/** Intro and Earth reveal: the stretch the first gesture flies. */
const ARRIVAL_H = JOURNEY.anchors.earth;

/**
 * Normalised time at which the intro flight has covered `fraction` of its way: the inverse of its easing.
 * Pacing the choreography on this clock gives every beat its share of time, although the flight itself starts
 * fast (for an immediate response) and brakes for a long time.
 */
export function introClock(fraction: number) {
  const target = clamp01(fraction);
  if (target >= 1) return 1;
  let low = 0, high = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (flightEase(mid) < target) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

/**
 * The entrance: the camera never moves. The logo dissolves while the streamers swim onto great circles around a
 * sphere, the planet appears inside that cocoon and the coloured field recedes into space.
 * Every value is a pure function of progress, so scrubbing back plays it in reverse.
 */
export function journeyAt(progress: number, reducedMotion = false) {
  const p = clamp01(progress);
  const timeline = sampleJourney(p * JOURNEY.totalH, JOURNEY, reducedMotion);
  const clock = introClock(timeline.positionH / ARRIVAL_H);
  const span = (from: number, to: number) => smootherRange(from, to, clock);
  const identity = 1 - span(0, 0.14);
  return {
    progress: p,
    clock,
    identity,
    prompt: 1 - span(0, 0.04),
    /** The logo's points drift apart and past the camera. */
    burst: reducedMotion ? 0 : span(0.02, 0.36),
    logo: reducedMotion ? identity : 1 - span(0.05, 0.34),
    /** 0: streamers swim freely; 1: wrapped around the globe. */
    gather: reducedMotion ? 0 : span(0.1, 0.62),
    worms: reducedMotion ? 0 : 1 - span(0.66, 0.9),
    /** The coloured, grainy backdrop of the intro. */
    field: 1 - span(0.5, 0.92),
    earth: { ...timeline.earth, visible: span(0.36, 0.78) },
    timeline,
  };
}
export type JourneyFrame = ReturnType<typeof journeyAt>;
