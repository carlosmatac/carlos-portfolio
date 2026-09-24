import { JOURNEY, sampleJourney } from "./journey-timeline";
export { INTRO_END, stopProgress } from "./journey-timeline";

/** Departure, orbital transfer and landing share a continuous reversible clock. */
export function earthAt(progress: number, reduced = false) {
  return sampleJourney(progress * JOURNEY.totalH, JOURNEY, reduced).earth;
}
export type EarthFrame = ReturnType<typeof earthAt>;
