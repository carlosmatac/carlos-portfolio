import { clamp01 } from "./easing";
import { JOURNEY, sampleJourney } from "./journey-timeline";
import { easeInverse, flightEase, smootherRange } from "./motion";
export { clamp01, smoothstep } from "./easing";

/** Intro and Earth reveal: the stretch the first gesture flies. */
const ARRIVAL_H = JOURNEY.anchors.earth;

/**
 * Normalised time at which the intro flight has covered `fraction` of its way: the inverse of its easing.
 * Pacing the choreography on this clock gives every beat its share of time, although the flight itself starts
 * fast (for an immediate response) and brakes for a long time.
 */
export const introClock = (fraction: number) => easeInverse(flightEase, fraction);

/**
 * The entrance: the camera never moves. The logo dissolves, the strokes of the backdrop turn towards the centre
 * and stretch as if jumping to light speed, and the planet appears where they converge.
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
    /** 0: the backdrop's strokes follow their flow field; 1: radial, stretched towards the planet. */
    warp: reducedMotion ? 0 : span(0.03, 0.55),
    /** The backdrop of strokes behind the intro. */
    field: 1 - span(0.42, 0.86),
    earth: { ...timeline.earth, visible: span(0.36, 0.78) },
    timeline,
  };
}
export type JourneyFrame = ReturnType<typeof journeyAt>;
