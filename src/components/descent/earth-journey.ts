import { places } from "@/content/places";
import { clamp01, smoothstep } from "./easing";

export const INTRO_END = 0.25;
export const FIRST_STOP = 0.32;
export const STOP_INTERVAL = 0.16;
export const stopProgress = (index: number) => FIRST_STOP + index * STOP_INTERVAL;

/** Departure, orbital transfer and landing share a continuous reversible clock. */
export function earthAt(progress: number, reduced = false) {
  const p = clamp01(progress);
  const route = Math.max(0, (p - FIRST_STOP) / STOP_INTERVAL);
  const from = Math.min(places.length - 1, Math.floor(route));
  const to = Math.min(places.length - 1, from + 1);
  const t = from === to ? 0 : route - from;
  const turn = smoothstep(0.43, 0.82, t);
  const altitude = smoothstep(0.28, 0.53, t) * (1 - smoothstep(0.68, 1, t));
  const landing = smoothstep(INTRO_END, FIRST_STOP, p);
  const active = turn < 0.5 ? from : to;
  const text = p < FIRST_STOP
    ? smoothstep(0.285, FIRST_STOP, p)
    : 1 - smoothstep(0.28, 0.43, t) + smoothstep(0.87, 1, t);
  return {
    from: reduced ? active : from, to: reduced ? active : to, turn: reduced ? 0 : turn, active,
    altitude: reduced ? 0 : altitude,
    landing: reduced ? 1 : landing,
    visible: smoothstep(0.175, 0.24, p),
    text: reduced ? Number(p >= 0.285) : text,
    navigation: smoothstep(0.25, 0.285, p),
  };
}
export type EarthFrame = ReturnType<typeof earthAt>;
