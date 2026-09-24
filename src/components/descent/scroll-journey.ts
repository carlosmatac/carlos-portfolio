import { stopProgress, travelSegments, type TravelSegment } from "./journey-timeline";
import { places } from "@/content/places";
import { flightEase } from "./motion";

// The first gesture enters the screen and lands; later gestures visit one city.
export const JOURNEY_STOPS = [0, ...places.map((_, i) => stopProgress(i))];
export const GESTURE_GAP_MS = 280;

export function adjacentStop(position: number, direction: number) {
  const epsilon = 0.001;
  return direction > 0
    ? JOURNEY_STOPS.find(stop => stop > position + epsilon) ?? JOURNEY_STOPS.at(-1)!
    : [...JOURNEY_STOPS].reverse().find(stop => stop < position - epsilon) ?? 0;
}

/** One wheel burst includes the device's momentum tail, even after landing. */
export class WheelGesture {
  private last = -Infinity;
  private distance = 0;
  private consumed = false;
  private previous = 0;

  push(delta: number, now: number, busy: boolean): number {
    if (!delta) return 0;
    const gap = now - this.last;
    const magnitude = Math.abs(delta), previousMagnitude = Math.abs(this.previous);
    const reversed = Math.sign(delta) !== Math.sign(this.previous) && magnitude >= 12;
    const renewed = magnitude >= 24 && magnitude >= previousMagnitude * 2.5
      && (previousMagnitude <= 10 || gap >= 80);
    if (gap > GESTURE_GAP_MS || (!busy && (reversed || renewed))) {
      this.distance = 0;
      this.consumed = false;
    }
    this.last = now;
    this.previous = delta;
    if (busy) this.consumed = true;
    if (this.consumed) return 0;
    if (Math.sign(delta) !== Math.sign(this.distance)) this.distance = 0;
    this.distance += Math.sign(delta) * Math.min(Math.abs(delta), 80);
    if (Math.abs(this.distance) < 12) return 0;
    this.consumed = true;
    return Math.sign(this.distance);
  }
}

export type JourneyFlight = { from: number; to: number; started: number; duration: number; segments: TravelSegment[] };

export function createFlight(from: number, to: number, now: number): JourneyFlight {
  // Duration depends on the journey, never on the force of the wheel event.
  const low = Math.min(from, to), high = Math.max(from, to);
  const duration = low < stopProgress(0) - 0.001 || JOURNEY_STOPS.some(stop => stop > low + 0.001 && stop < high - 0.001) ? 5600 : 4800;
  return { from, to, started: now, duration, segments: travelSegments(from, to) };
}

export function flightPosition(flight: JourneyFlight, now: number) {
  const t = Math.max(0, Math.min(1, (now - flight.started) / flight.duration));
  if (t === 0) return flight.from;
  if (t === 1) return flight.to;
  const distance = flight.segments.reduce((sum, s) => sum + Math.abs(s.to - s.from), 0);
  if (!distance) return flight.to;
  let remaining = distance * flightEase(t);
  for (const segment of flight.segments) {
    const length = Math.abs(segment.to - segment.from);
    if (remaining <= length) return segment.from + Math.sign(segment.to - segment.from) * remaining;
    remaining -= length;
  }
  return flight.to;
}

export type JourneySeek = { from: number; to: number; started: number };
export const createSeek = (from: number, to: number, now: number): JourneySeek => ({ from, to, started: now });

export function seekFrame(seek: JourneySeek, now: number) {
  const elapsed = Math.max(0, now - seek.started);
  return {
    position: elapsed < 180 ? seek.from : seek.to,
    opacity: elapsed < 180 ? elapsed / 180 : Math.max(0, 1 - (elapsed - 180) / 280),
    done: elapsed >= 460,
  };
}
